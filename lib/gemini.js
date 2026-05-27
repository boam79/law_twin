import {
  canonicalizeSearchQueries,
  expandLawAliasQueries,
  extractLawLikeSearchQuery,
  ignoredStandaloneLawQueries,
  isLawLikeSearchQuery,
  normalizeCompact,
} from "./lawSearchTerms";
import {
  getGeminiApiKeys,
  getGeminiModel,
  getGeminiModelChain,
  getGeminiPlannerModelChain,
  getGeminiSummaryMaxTokens,
  getGeminiSummaryMode,
  getGeminiSummaryTemperature,
  isGeminiConfigured,
  redactSecrets,
  wrapScenarioForPrompt,
} from "./security.js";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_RATE_LIMIT_HINT =
  "무료 Gemini 모델 한도(분당 약 5회)에 모두 걸렸습니다. API 키를 여러 개 설정했다면 순서대로 자동 시도했습니다. 1~2분 기다린 뒤 다시 분석해 주세요. 체크리스트·법령 결과는 아래에서 계속 볼 수 있습니다.";

const GEMINI_MODEL_LABELS = {
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.0-flash-lite": "Gemini 2.0 Flash Lite",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-2.5-flash-lite": "Gemini 2.5 Flash Lite",
};

export function getGeminiModelLabel(model) {
  return GEMINI_MODEL_LABELS[model] || model || "Gemini";
}

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
  const fallbackQueries = normalizeQueries(analysis?.searchQueries || []);

  if (!isGeminiConfigured()) {
    return { enabled: false, configured: false, queries: [], rationale: [], error: null, usedFallback: true };
  }

  const prompt = buildLawSearchPrompt({ scenario, analysis });

  try {
    const response = await generateContentWithModelFallback({
      prompt,
      temperature: 0.1,
      maxOutputTokens: 900,
      modelChain: getGeminiPlannerModelChain(),
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
  const summaryMode = getGeminiSummaryMode();

  if (!isGeminiConfigured()) {
    return { enabled: false, configured: false, text: null, error: null, summarySkipped: true, summaryMode };
  }

  if (summaryMode === "off") {
    return {
      enabled: false,
      configured: true,
      text: null,
      error: null,
      summarySkipped: true,
      summaryMode,
      skipReason: "GEMINI_SUMMARY_MODE=off — API 호출 없이 법령·체크리스트만 제공합니다.",
    };
  }

  const prompt = buildPrompt({ scenario, analysis, lawApi, summaryMode });
  const maxOutputTokens = getGeminiSummaryMaxTokens(summaryMode);
  const temperature = getGeminiSummaryTemperature(summaryMode);

  try {
    const response = await generateContentWithModelFallback({
      prompt,
      temperature,
      maxOutputTokens,
    });

    if (!response.ok) {
      return {
        enabled: true,
        configured: true,
        text: null,
        error: formatGeminiUserError(response.status),
        status: response.status,
        retryable: response.allRateLimited,
        modelUsed: response.model,
        modelLabel: getGeminiModelLabel(response.model),
        modelsTried: response.modelsTried,
        modelsTriedLabel: formatGeminiModelsTried(response.modelsTried),
        fallbackNote: null,
        summarySkipped: false,
        summaryMode,
        lawOnlyFallback: true,
      };
    }

    const text = response.text?.trim() || null;
    const fallbackNote = buildModelFallbackNote(response);

    return {
      enabled: true,
      configured: true,
      text,
      error: text ? null : "Gemini 요약이 비어 있습니다.",
      modelUsed: response.model,
      modelLabel: getGeminiModelLabel(response.model),
      modelsTried: response.modelsTried,
      modelsTriedLabel: formatGeminiModelsTried(response.modelsTried),
      fallbackNote,
      summarySkipped: false,
      summaryMode,
      lawOnlyFallback: false,
    };
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
      modelUsed: null,
      modelLabel: null,
      modelsTried: error?.modelsTried || [],
      fallbackNote: null,
      summarySkipped: false,
      summaryMode,
      lawOnlyFallback: true,
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

async function generateContentWithModelFallback({ prompt, temperature, maxOutputTokens, modelChain }) {
  const models = modelChain?.length ? modelChain : getGeminiModelChain();
  const apiKeys = getGeminiApiKeys();
  const modelsTried = [];
  let lastStatus = null;
  let allRateLimited = true;

  if (!apiKeys.length) {
    return {
      ok: false,
      status: 403,
      text: "",
      model: getGeminiModel(),
      modelsTried: [],
      modelChain: models,
      allRateLimited: false,
      apiKeysTried: 0,
    };
  }

  for (const model of models) {
    modelsTried.push(model);
    let modelAllKeysRateLimited = true;

    for (const apiKey of apiKeys) {
      const response = await generateContentOnce({ model, apiKey, prompt, temperature, maxOutputTokens });

      if (response.ok && response.text?.trim()) {
        return {
          ...response,
          model,
          modelsTried,
          modelChain: models,
          apiKeysTried: apiKeys.indexOf(apiKey) + 1,
        };
      }

      lastStatus = response.status;

      if (response.status === 429) {
        continue;
      }

      modelAllKeysRateLimited = false;
      allRateLimited = false;

      if (!shouldTryNextGeminiModel(response.status, response.ok && !response.text?.trim())) {
        return {
          ok: false,
          status: lastStatus || 400,
          text: "",
          model,
          modelsTried,
          modelChain: models,
          allRateLimited: false,
          apiKeysTried: apiKeys.length,
        };
      }

      break;
    }

    if (modelAllKeysRateLimited) {
      return {
        ok: false,
        status: lastStatus || 429,
        text: "",
        model,
        modelsTried,
        modelChain: models,
        allRateLimited: true,
        apiKeysTried: apiKeys.length,
      };
    }
  }

  return {
    ok: false,
    status: lastStatus || 429,
    text: "",
    model: models[models.length - 1] || getGeminiModel(),
    modelsTried,
    modelChain: models,
    allRateLimited,
    apiKeysTried: apiKeys.length,
  };
}

function shouldTryNextGeminiModel(status, emptyText) {
  if (status === 429) return false;
  if (emptyText) return true;
  if (status === 404 || status === 503 || status === 502 || status === 500) return true;
  return false;
}

async function generateContentOnce({ model, apiKey, prompt, temperature, maxOutputTokens }) {
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
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return { ok: false, status: response.status, text: "" };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n") || "";
    return { ok: true, status: response.status, text };
  } catch {
    return { ok: false, status: 503, text: "" };
  }
}

function buildModelFallbackNote(response) {
  const tried = response.modelsTried || [];
  if (tried.length < 2 || !response.model) return null;
  const first = getGeminiModelLabel(tried[0]);
  const used = getGeminiModelLabel(response.model);
  if (first === used) return null;
  return `${first} 실패 → ${used}로 요약했습니다.`;
}

export function formatGeminiModelsTried(modelsTried) {
  if (!modelsTried?.length) return "";
  return modelsTried.map((id) => getGeminiModelLabel(id)).join(" → ");
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

function buildPrompt({ scenario, analysis, lawApi, summaryMode = "lite" }) {
  const lawLimit = summaryMode === "full" ? 5 : 4;
  const laws =
    analysis.laws
      .slice(0, lawLimit)
      .map((law) => formatLawLineForPrompt(law, summaryMode))
      .join("\n") || "- 없음";

  const conflictLimit = summaryMode === "full" ? 4 : 2;
  const conflicts =
    analysis.conflicts
      .slice(0, conflictLimit)
      .map((conflict) => formatConflictLineForPrompt(conflict, summaryMode))
      .join("\n") || "- 없음";

  const liveLawNames =
    lawApi.items
      .map((item) => item.title)
      .filter(Boolean)
      .slice(0, summaryMode === "full" ? 8 : 5)
      .join(", ") || "없음";

  const labels = analysis?.labels || {};
  const topicLine = (labels.topics || []).slice(0, 4).join(", ") || "일반";

  const outputRules =
    summaryMode === "full"
      ? ["출력:", "1. 핵심 리스크 한 문장", "2. 확인 법령 3개(법령명만)", "3. 실무 체크 3개(짧게)"]
      : ["출력(각 1문장, 총 8줄 이내):", "①핵심 리스크 ②확인 법령 3개(이름만) ③실무 체크 3개"];

  return [
    "한국 법령 영향 분석 보조. 확정 판단 금지, 검토 후보만.",
    `상황:\n${wrapScenarioForPrompt(scenario)}`,
    `업종·지역·주제: ${labels.sector || "-"} / ${labels.region || "-"} / ${topicLine}`,
    `관련 법령:\n${laws}`,
    `법제처 검색: ${liveLawNames}`,
    `충돌 후보:\n${conflicts}`,
    ...outputRules,
  ].join("\n");
}

function formatLawLineForPrompt(law, summaryMode) {
  const title = law?.title || "법령";
  if (summaryMode !== "full") return `- ${title}`;
  const article = law?.article ? ` ${law.article}` : "";
  const evidence = String(law?.evidence || "").slice(0, 100);
  return `- ${title}${article}: ${evidence}`;
}

function formatConflictLineForPrompt(conflict, summaryMode) {
  const title = conflict?.title || "충돌";
  if (summaryMode !== "full") return `- ${title}`;
  const detail = String(conflict?.detail || "").slice(0, 80);
  return `- ${title}: ${detail}`;
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

