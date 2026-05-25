import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const LAW_SEARCH_URLS = [
  "https://www.law.go.kr/DRF/lawSearch.do",
  "http://www.law.go.kr/DRF/lawSearch.do",
];

export async function fetchLawSearchResults(query) {
  const apiKey = process.env.LAW_API_KEY;
  if (!apiKey || !query) {
    return { enabled: Boolean(apiKey), query, items: [], error: null };
  }

  const params = new URLSearchParams({
    OC: apiKey,
    target: "law",
    type: "JSON",
    display: "10",
    query,
  });

  try {
    const data = await fetchFirstAvailable(params);
    const rawItems = normalizeLawItems(data?.LawSearch?.law);

    return {
      enabled: true,
      query,
      items: rawItems.slice(0, 10).map((item) => ({
        id: item["법령일련번호"] || item.lawId || item.id || "",
        title: item["법령명한글"] || item.lawName || item.title || "",
        agency: item["소관부처명"] || item.agency || "",
        promulgationDate: item["공포일자"] || "",
        enforcementDate: item["시행일자"] || "",
        detailPath: sanitizeDetailPath(item["법령상세링크"] || ""),
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

export async function fetchLawSearchBatch(queries) {
  const cleanQueries = [...new Set((queries || []).map((query) => String(query || "").trim()).filter(Boolean))].slice(0, 8);
  if (!cleanQueries.length) {
    return { enabled: Boolean(process.env.LAW_API_KEY), queries: [], items: [], errors: [] };
  }

  const results = await Promise.all(cleanQueries.map((query) => fetchLawSearchResults(query)));
  const itemsByKey = new Map();
  const errors = [];

  results.forEach((result) => {
    if (result.error) errors.push({ query: result.query, message: result.error });
    result.items.forEach((item) => {
      const key = item.id || `${item.title}-${item.enforcementDate}`;
      if (!itemsByKey.has(key)) {
        itemsByKey.set(key, {
          ...item,
          matchedQuery: result.query,
        });
      }
    });
  });

  return {
    enabled: results.some((result) => result.enabled),
    queries: cleanQueries,
    items: [...itemsByKey.values()].slice(0, 30),
    errors,
    error: errors.length === results.length ? errors.map((item) => `${item.query}: ${item.message}`).join(" / ") : null,
  };
}

async function fetchFirstAvailable(params) {
  let lastError = null;

  for (const url of LAW_SEARCH_URLS) {
    try {
      const response = await fetch(`${url}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "LawTwin/0.1",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        lastError = new Error(`law.go.kr ${response.status}`);
        continue;
      }

      return response.json();
    } catch (error) {
      lastError = error;
      try {
        return await requestJson(`${url}?${params.toString()}`);
      } catch (fallbackError) {
        lastError = fallbackError;
      }
    }
  }

  throw lastError || new Error("법제처 API 호출 실패");
}

function requestJson(rawUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(rawUrl);
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = transport(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        family: 4,
        timeout: 6000,
        headers: {
          Accept: "application/json",
          "User-Agent": "LawTwin/0.1",
        },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`law.go.kr ${response.statusCode || "unknown"}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("law.go.kr timeout"));
    });
    request.on("error", reject);
    request.end();
  });
}

function normalizeLawItems(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function sanitizeDetailPath(path) {
  if (!path) return "";
  try {
    const url = new URL(path, "https://www.law.go.kr");
    url.searchParams.delete("OC");
    return `${url.pathname}${url.search}`;
  } catch {
    return "";
  }
}
