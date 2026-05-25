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
    ["중대재해처벌법", ["중대재해 처벌 등에 관한 법률"]],
    ["개인정보보호법", ["개인정보 보호법"]],
    ["정보통신망법", ["정보통신망 이용촉진 및 정보보호 등에 관한 법률"]],
    ["전자상거래법", ["전자상거래 등에서의 소비자보호에 관한 법률"]],
    ["방문판매법", ["방문판매 등에 관한 법률"]],
    ["표시광고법", ["표시ㆍ광고의 공정화에 관한 법률"]],
    ["학원법", ["학원의 설립ㆍ운영 및 과외교습에 관한 법률"]],
    ["소방법", ["소방시설 설치 및 관리에 관한 법률", "화재의 예방 및 안전관리에 관한 법률"]],
    ["임대차보호법", ["주택임대차보호법", "상가건물 임대차보호법"]],
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
