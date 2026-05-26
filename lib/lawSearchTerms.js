export const ignoredStandaloneLawQueries = new Set([
  "취업규칙",
  "근로계약",
  "급여명세서",
  "개인정보처리방침",
  "처리방침",
  "환불규정",
  "원산지표시",
  "시설기준",
  "위생교육",
  "안전교육",
  "표시광고",
  "스프링클러설비",
]);

const lawAliasQueries = new Map(
  [
    ["근기법", ["근로기준법"]],
    ["산안법", ["산업안전보건법"]],
    ["산재법", ["산업안전보건법"]],
    ["산재보험법", ["산업재해보상보험법"]],
    ["중처법", ["중대재해 처벌 등에 관한 법률"]],
    ["중대재해처벌법", ["중대재해 처벌 등에 관한 법률"]],
    ["개인정보법", ["개인정보 보호법"]],
    ["개인정보보호법", ["개인정보 보호법"]],
    ["정보통신망법", ["정보통신망 이용촉진 및 정보보호 등에 관한 법률"]],
    ["전자상거래법", ["전자상거래 등에서의 소비자보호에 관한 법률"]],
    ["통신판매법", ["전자상거래 등에서의 소비자보호에 관한 법률"]],
    ["방문판매법", ["방문판매 등에 관한 법률"]],
    ["표시광고법", ["표시ㆍ광고의 공정화에 관한 법률"]],
    ["약관법", ["약관의 규제에 관한 법률"]],
    ["학원법", ["학원의 설립ㆍ운영 및 과외교습에 관한 법률"]],
    ["청소년보호법", ["청소년 보호법"]],
    ["소방법", ["소방시설 설치 및 관리에 관한 법률", "화재의 예방 및 안전관리에 관한 법률"]],
    ["화재예방법", ["화재의 예방 및 안전관리에 관한 법률"]],
    ["임대차보호법", ["주택임대차보호법", "상가건물 임대차보호법"]],
    ["소음진동관리법", ["소음ㆍ진동관리법"]],
    ["대기환경법", ["대기환경보전법"]],
    ["물환경법", ["물환경보전법"]],
    ["옥외광고물법", ["옥외광고물 등의 관리와 옥외광고산업 진흥에 관한 법률"]],
    ["응급의료법", ["응급의료에 관한 법률"]],
  ].map(([alias, queries]) => [normalizeCompact(alias), queries]),
);

export function expandLawAliasQueries(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  return lawAliasQueries.get(normalizeCompact(text)) || [text];
}

export function isLawLikeSearchQuery(value) {
  return /(법률|보호법|관리법|기본법|특별법|보장법|보전법|교통법|건축법|민법|상법|형법|법|령|규칙|조례|고시)$/u.test(
    String(value || "").trim(),
  );
}

export function extractLawLikeSearchQuery(value) {
  const text = String(value || "")
    .replace(/\s*제\s*\d+\s*조.*$/u, "")
    .replace(/\s*\([^)]*\)\s*$/u, "")
    .trim();
  if (!text) return "";

  const matches = [
    ...text.matchAll(/[가-힣A-Za-z0-9ㆍ·\s]+(?:법률|보호법|관리법|기본법|특별법|보장법|보전법|교통법|건축법|민법|상법|형법|법|령|규칙|조례|고시)/gu),
  ]
    .map((match) => match[0].replace(/^(관련|대한|검토|우선)\s+/u, "").trim())
    .filter(Boolean);

  return matches.at(-1) || text;
}

export function normalizeCompact(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

const canonicalLawQueryMap = new Map(
  [
    ["표시광고의공정화에관한법률", "표시ㆍ광고의 공정화에 관한 법률"],
    ["표시광고의공정화에관한법", "표시ㆍ광고의 공정화에 관한 법률"],
    ["표시광고법", "표시ㆍ광고의 공정화에 관한 법률"],
    ["전자상거래등에서의소비자보호에관한법률", "전자상거래 등에서의 소비자보호에 관한 법률"],
    ["개인정보보호법", "개인정보 보호법"],
    ["학원법", "학원의 설립ㆍ운영 및 과외교습에 관한 법률"],
  ].map(([key, value]) => [key, value]),
);

const sentenceLikeQueryPattern =
  /(?:하려고|해야|있는지|궁금|모르겠|찾아|알려|보내|받아|들어왔|나와|열리|바꾸|철거|해체)/u;

export function canonicalizeLawQuery(value) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/ㆍ/g, "ㆍ")
    .trim();
  if (!cleaned) return "";

  const compact = normalizeCompact(cleaned.replace(/ㆍ/g, "").replace(/\s+/g, ""));
  if (canonicalLawQueryMap.has(compact)) return canonicalLawQueryMap.get(compact);

  if (/표시\s*광고/u.test(cleaned)) return "표시ㆍ광고의 공정화에 관한 법률";
  if (/표시\s*ㆍ\s*광고/u.test(cleaned)) return "표시ㆍ광고의 공정화에 관한 법률";

  return cleaned;
}

export function canonicalizeSearchQueries(queries) {
  return [
    ...new Set(
      (queries || [])
        .map((query) => canonicalizeLawQuery(query))
        .flatMap(expandLawAliasQueries)
        .map((query) => String(query || "").trim())
        .filter(Boolean),
    ),
  ];
}

export function isSentenceLikeLawQuery(value) {
  const text = String(value || "").trim();
  if (text.length > 28 && sentenceLikeQueryPattern.test(text)) return true;
  if (text.length > 40) return true;
  if (/(신고|확인|절차|관련).{0,12}법$/u.test(text) && text.length > 18) return true;
  if (/^(인터넷|온라인).{0,40}법$/u.test(text)) return true;
  if (/(뭔가|건데|이상해|도와|걸릴|해야|있는지).{0,30}법$/u.test(text)) return true;
  return false;
}

export function scoreLawTitleForQuery(title, query) {
  const lawTitle = normalizeCompact(String(title || "").replace(/ㆍ/g, ""));
  const lawQuery = normalizeCompact(String(query || "").replace(/ㆍ/g, ""));
  if (!lawTitle || !lawQuery) return 0;

  if (lawTitle === lawQuery) return 120;
  if (lawTitle.startsWith(lawQuery)) return 95;
  if (lawQuery.length >= 4 && lawTitle.endsWith(lawQuery)) return 85;

  if (lawQuery.endsWith("법") && lawTitle.includes(lawQuery)) {
    const extra = lawTitle.replace(lawQuery, "");
    if (extra.length > 6) return 25;
    return 70;
  }

  if (lawTitle.includes(lawQuery)) return 35;
  return 0;
}

export function lawTitlesMatch(title, expectedName) {
  const lawTitle = normalizeCompact(String(title || "").replace(/ㆍ/g, ""));
  const expected = normalizeCompact(String(expectedName || "").replace(/ㆍ/g, ""));
  if (!lawTitle || !expected) return false;
  if (lawTitle === expected) return true;
  if (lawTitle.startsWith(expected)) return true;

  const aliases = {
    전자상거래법: "전자상거래등에서의소비자보호에관한법률",
    학원법: "학원의설립운영및과외교습에관한법률",
    개인정보법: "개인정보보호법",
    정보통신망법: "정보통신망이용촉진및정보보호등에관한법률",
  };

  const expectedKey = normalizeCompact(expectedName);
  if (aliases[expectedKey] && lawTitle.startsWith(aliases[expectedKey])) return true;

  return expected.length >= 4 && lawTitle.includes(expected);
}
