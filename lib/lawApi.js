import { request as httpsRequest } from "node:https";
import { canonicalizeLawQuery, scoreLawTitleForQuery } from "./lawSearchTerms.js";
import { redactSecrets, sanitizeLawDetailPath } from "./security.js";

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
    display: "10",
    query,
  });

  try {
    const data = await fetchFirstAvailable(params);
    const rawItems = rankLawSearchItems(normalizeLawItems(data?.LawSearch?.law), query);

    return {
      enabled: true,
      query,
      items: rawItems.slice(0, 10).map((item) => ({
        id: item["법령일련번호"] || item.lawId || item.id || "",
        title: item["법령명한글"] || item.lawName || item.title || "",
        agency: item["소관부처명"] || item.agency || "",
        promulgationDate: item["공포일자"] || "",
        enforcementDate: item["시행일자"] || "",
        detailPath: sanitizeLawDetailPath(item["법령상세링크"] || ""),
      })),
      error: null,
    };
  } catch (error) {
    return {
      enabled: true,
      query,
      items: [],
      error: redactSecrets(error instanceof Error ? error.message : "법제처 API 호출 실패"),
    };
  }
}

export async function fetchLawSearchBatch(queries) {
  const cleanQueries = [
    ...new Set((queries || []).map((query) => canonicalizeLawQuery(String(query || "").trim())).filter(Boolean)),
  ].slice(0, 8);
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
  const requestUrl = `${LAW_SEARCH_URL}?${params.toString()}`;

  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LawTwin/0.1",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      throw new Error(`law.go.kr ${response.status}`);
    }

    return response.json();
  } catch (error) {
    try {
      return await requestJson(requestUrl);
    } catch (fallbackError) {
      throw fallbackError || error;
    }
  }
}

function requestJson(rawUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") {
      reject(new Error("law.go.kr must use HTTPS"));
      return;
    }
    const transport = httpsRequest;
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

function rankLawSearchItems(items, query) {
  return [...items].sort((left, right) => {
    const leftTitle = left["법령명한글"] || left.lawName || left.title || "";
    const rightTitle = right["법령명한글"] || right.lawName || right.title || "";
    const leftScore = scoreLawTitleForQuery(leftTitle, query);
    const rightScore = scoreLawTitleForQuery(rightTitle, query);
    if (rightScore !== leftScore) return rightScore - leftScore;
    return String(leftTitle).length - String(rightTitle).length;
  });
}

