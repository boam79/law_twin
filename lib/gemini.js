import {
  canonicalizeSearchQueries,
  expandLawAliasQueries,
  extractLawLikeSearchQuery,
  ignoredStandaloneLawQueries,
  isLawLikeSearchQuery,
  normalizeCompact,
} from "./lawSearchTerms";
import { getGeminiModel, redactSecrets, wrapScenarioForPrompt } from "./security.js";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const RETRY_DELAYS_MS = [0];

export const GEMINI_RATE_LIMIT_HINT =
  "Gemini 무료 한도(분당 약 5회)에 걸렸습니다. 1~2분 기다린 뒤 다시 분석해 주세요. 체크리스트·법령 결과는 아래에서 계속 볼 수 있습니다.";

export function formatGeminiUserError(status, fallbackMessage = "") {
  const code = Number(status) || 0;
  if (code === 429) {
    return GEMINI_RATE_LIMIT_HINT;
  }
  if (code === 403) return "Gemini API 키 또는 사용 권한을 확인해 주세요.";
  if (code === 400) return "AI 요청 형식 오류입니다. 입력 내용을 줄여 다시 시도해 주세요.";
  if (code >= 500) return "Gemini 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.";
  if (fallbackMessage) return redactSecrets(fallbackMessage);
  return code ? `Gemini API 오류(${code})` : "Gemini API 호출에 실패했습니다.";
}

export async function planLawSearchWithGemini({ scenario, analysis }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallbackQueries = normalizeQueries(analysis?.searchQueries || []);

  if (!apiKey) {
    return { enabled: false, configured: false, queries: [], rationale: [], error: null, usedFallback: true };
  }

  const model = getGeminiModel();
  const prompt = buildLawSearchPrompt({ scenario, analysis });

  try {
    const response = await generateContentWithRetry({
      model,
      apiKey,
      prompt,
      temperature: 0.1,
      maxOutputTokens: 900,
    });

    if (!response.ok) {
      return buildPlanFallback(fallbackQueries, formatGeminiUserError(response.status));
    }

    const parsed = parseJsonObject(response.text);
    const queries = normalizeQueries(parsed?.queries);
    const rationale = Array.isArray(parsed?.rationale) ? parsed.rationale.map((item) => String(item).trim()).filter(Boolean).slice(0, 6) : [];

    if (!queries.length) {
      return buildPlanFallback(fallbackQueries, null, ["Gemini 후보가 비어 있어 내부 자연어 분석 후보를 사용했습니다."]);
    }

    return { enabled: true, configured: true, queries, rationale, error: null, usedFallback: false };
  } catch (error) {
    return buildPlanFallback(
      fallbackQueries,
      redactSecrets(error instanceof Error ? error.message : "Gemini 검색 계획 실패"),
    );
  }
}

export async function summarizeWithGemini({ scenario, analysis, lawApi }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { enabled: false, configured: false, text: null, error: null };
  }

  const model = getGeminiModel();
  const prompt = buildPrompt({ scenario, analysis, lawApi });

  try {
    const response = await generateContentWithRetry({
      model,
      apiKey,
      prompt,
      temperature: 0.2,
      maxOutputTokens: 700,
    });

    if (!response.ok) {
      return {
        enabled: true,
        configured: true,
        text: null,
        error: formatGeminiUserError(response.status),
        status: response.status,
        retryable: response.status === 429,
      };
    }

    const text = response.text?.trim() || null;
    return { enabled: true, configured: true, text, error: text ? null : "Gemini 요약이 비어 있습니다." };
  } catch (error) {
    return {
      enabled: true,
      configured: true,
      text: null,
      error: formatGeminiUserError(
        error?.status,
        error instanceof Error ? error.message : "Gemini API 호출 실패",
      ),
      status: error?.status,
      retryable: error?.status === 429,
    };
  }
}

function buildPlanFallback(fallbackQueries, error, rationale = []) {
  return {
    enabled: true,
    configured: true,
    queries: fallbackQueries,
    rationale: rationale.length
      ? rationale
      : fallbackQueries.length
        ? ["Gemini 검색 계획 실패로 내부 자연어 분석 후보를 사용했습니다."]
        : [],
    error,
    usedFallback: true,
  };
}

async function generateContentWithRetry({ model, apiKey, prompt, temperature, maxOutputTokens }) {
  let lastStatus = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay) await sleep(delay);

    try {
      const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(14000),
      });

      lastStatus = response.status;

      if (!response.ok) {
        return { ok: false, status: response.status, text: "" };
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n") || "";
      return { ok: true, status: response.status, text };
    } catch (error) {
      if (attempt === RETRY_DELAYS_MS.length - 1) {
        const wrapped = error instanceof Error ? error : new Error("Gemini API 호출 실패");
        wrapped.status = lastStatus;
        throw wrapped;
      }
    }
  }

  const rateLimited = new Error("Gemini API 429");
  rateLimited.status = 429;
  throw rateLimited;
}

function buildLawSearchPrompt({ scenario, analysis }) {
  return [
    "너는 대한민국 법령 검색어 설계자다.",
    "사용자의 자연어 상황을 읽고 law.go.kr 법제처 '전체 법령' 검색에 넣을 실제 법령명 후보만 골라라.",
    "원칙:",
    "- 법령명이 아닌 단어를 단독 검색어로 내지 않는다. 예: 취업규칙, 처리방침, 환불규정, 스프링클러설비, 위생교육",
    "- 포괄임금제, 선택근로제, 취업규칙 변경 같은 표현은 법령명이 아니라 근로기준법 쟁점으로 본다.",
    "- 알바 월급, 고객 전화번호, 환불 안 됨, 학원차, 식당 오픈, 간판 설치처럼 일상 표현을 먼저 법적 쟁점으로 번역한다.",
    "- 산재, 홍보문자, 무료체험 자동결제, 미성년자 술판매, 보증금, 폐수·소음 민원처럼 법령명이 없는 표현도 공식 법령명 후보로 변환한다.",
    "- 통칭 법령명은 공식 법령명으로 바꾼다. 예: 학원법→학원의 설립ㆍ운영 및 과외교습에 관한 법률, 화재예방법→화재의 예방 및 안전관리에 관한 법률, 산안법→산업안전보건법",
    "- 사용자가 법령명을 모르는 경우에도 쟁점과 업종을 보고 가장 관련 높은 법률/시행령 검색어를 추론한다.",
    "- 기존 후보가 상황에 맞으면 queries에 반드시 포함한다.",
    "- 너무 넓은 일반어 대신 공식 법령명 또는 법령명에 가까운 검색어를 우선한다.",
    "- 모르면 억지로 많이 만들지 말고 확실한 후보만 낸다.",
    "- 출력은 JSON만 한다. 설명 문장이나 마크다운을 붙이지 않는다.",
    "",
    `상황:\n${wrapScenarioForPrompt(scenario)}`,
    `추론 업종: ${analysis?.labels?.sector || ""}`,
    `추론 지역: ${analysis?.labels?.region || ""}`,
    `추론 주제: ${(analysis?.labels?.topics || []).join(", ")}`,
    `기존 후보: ${(analysis?.searchQueries || []).join(", ")}`,
    "",
    "출력 JSON 형식:",
    '{"queries":["법령명1","법령명2"],"rationale":["법령명1: 선택 이유","법령명2: 선택 이유"]}',
  ].join("\n");
}

function buildPrompt({ scenario, analysis, lawApi }) {
  const laws = analysis.laws
    .slice(0, 5)
    .map((law) => `- ${law.title} ${law.article}: ${law.evidence}`)
    .join("\n");
  const conflicts = analysis.conflicts.map((conflict) => `- ${conflict.title}: ${conflict.detail}`).join("\n") || "- 없음";
  const liveLawNames = lawApi.items.map((item) => item.title).filter(Boolean).join(", ") || "없음";

  return [
    "너는 한국 법령데이터 기반 행정·준법 영향 분석 보조자다.",
    "법률 자문처럼 확정 판단하지 말고, 검토 후보와 근거 확인 항목 중심으로 답한다.",
    "",
    `사용자 상황:\n${wrapScenarioForPrompt(scenario)}`,
    "",
    "로컬 분석 근거:",
    laws,
    "",
    `법제처 API 검색 결과: ${liveLawNames}`,
    "",
    "충돌 가능성:",
    conflicts,
    "",
    "출력 형식:",
    "1. 핵심 리스크 한 문장",
    "2. 확인해야 할 법령 근거 3개",
    "3. 실무 체크리스트 3개",
  ].join("\n");
}

function parseJsonObject(text) {
  const source = String(text || "").trim();
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch {
    const match = source.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeQueries(value) {
  if (!Array.isArray(value)) return [];
  return canonicalizeSearchQueries(
    value
      .map(extractLawLikeSearchQuery)
      .flatMap(expandLawAliasQueries)
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  )
    .filter((item) => item.length >= 2 && item.length <= 60)
    .filter((item) => !ignoredStandaloneLawQueries.has(normalizeCompact(item)))
    .filter(isLawNameQuery)
    .slice(0, 8);
}

function isLawNameQuery(value) {
  return isLawLikeSearchQuery(value);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
