const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

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
