import {
  expandLawAliasQueries,
  extractLawLikeSearchQuery,
  ignoredStandaloneLawQueries,
  isLawLikeSearchQuery,
  normalizeCompact,
} from "./lawSearchTerms";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export async function planLawSearchWithGemini({ scenario, analysis }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { enabled: false, queries: [], rationale: [], error: null };
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt = buildLawSearchPrompt({ scenario, analysis });

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 900,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { enabled: true, queries: [], rationale: [], error: `Gemini API ${response.status}` };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n") || "";
    const parsed = parseJsonObject(text);
    const queries = normalizeQueries(parsed?.queries);
    const rationale = Array.isArray(parsed?.rationale) ? parsed.rationale.map((item) => String(item).trim()).filter(Boolean).slice(0, 6) : [];

    return { enabled: true, queries, rationale, error: null };
  } catch (error) {
    return {
      enabled: true,
      queries: [],
      rationale: [],
      error: error instanceof Error ? error.message : "Gemini 검색 계획 실패",
    };
  }
}

export async function summarizeWithGemini({ scenario, analysis, lawApi }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { enabled: false, text: null, error: null };
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt = buildPrompt({ scenario, analysis, lawApi });

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 700,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { enabled: true, text: null, error: `Gemini API ${response.status}` };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n") || null;
    return { enabled: true, text, error: null };
  } catch (error) {
    return {
      enabled: true,
      text: null,
      error: error instanceof Error ? error.message : "Gemini API 호출 실패",
    };
  }
}

function buildLawSearchPrompt({ scenario, analysis }) {
  return [
    "너는 대한민국 법령 검색어 설계자다.",
    "사용자의 자연어 상황을 읽고 law.go.kr 법제처 '전체 법령' 검색에 넣을 실제 법령명 후보만 골라라.",
    "원칙:",
    "- 법령명이 아닌 단어를 단독 검색어로 내지 않는다. 예: 취업규칙, 처리방침, 환불규정, 스프링클러설비, 위생교육",
    "- 포괄임금제, 선택근로제, 취업규칙 변경 같은 표현은 법령명이 아니라 근로기준법 쟁점으로 본다.",
    "- 사용자가 법령명을 모르는 경우에도 쟁점과 업종을 보고 가장 관련 높은 법률/시행령 검색어를 추론한다.",
    "- 기존 후보가 상황에 맞으면 queries에 반드시 포함한다.",
    "- 너무 넓은 일반어 대신 공식 법령명 또는 법령명에 가까운 검색어를 우선한다.",
    "- 모르면 억지로 많이 만들지 말고 확실한 후보만 낸다.",
    "- 출력은 JSON만 한다. 설명 문장이나 마크다운을 붙이지 않는다.",
    "",
    `상황: ${scenario}`,
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
    `사용자 상황: ${scenario}`,
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
  return [
    ...new Set(
      value
        .map(extractLawLikeSearchQuery)
        .flatMap(expandLawAliasQueries)
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  ]
    .filter((item) => item.length >= 2 && item.length <= 60)
    .filter((item) => !ignoredStandaloneLawQueries.has(normalizeCompact(item)))
    .filter(isLawNameQuery)
    .slice(0, 8);
}

function isLawNameQuery(value) {
  return isLawLikeSearchQuery(value);
}
