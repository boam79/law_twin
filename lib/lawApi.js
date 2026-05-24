const LAW_SEARCH_URL = "https://www.law.go.kr/DRF/lawSearch.do";

export async function fetchLawSearchResults(query) {
  const apiKey = process.env.LAW_API_KEY;
  if (!apiKey || !query) {
    return { enabled: Boolean(apiKey), query, items: [], error: null };
  }

  const params = new URLSearchParams({
    OC: apiKey,
    target: "law",
    type: "JSON",
    display: "5",
    query,
  });

  try {
    const response = await fetch(`${LAW_SEARCH_URL}?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return { enabled: true, query, items: [], error: `law.go.kr ${response.status}` };
    }

    const data = await response.json();
    const rawItems = normalizeLawItems(data?.LawSearch?.law);

    return {
      enabled: true,
      query,
      items: rawItems.slice(0, 5).map((item) => ({
        id: item["법령일련번호"] || item.lawId || item.id || "",
        title: item["법령명한글"] || item.lawName || item.title || "",
        agency: item["소관부처명"] || item.agency || "",
        promulgationDate: item["공포일자"] || "",
        enforcementDate: item["시행일자"] || "",
        detailPath: item["법령상세링크"] || "",
      })),
      error: null,
    };
  } catch (error) {
    return {
      enabled: true,
      query,
      items: [],
      error: error instanceof Error ? error.message : "법제처 API 호출 실패",
    };
  }
}

function normalizeLawItems(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
