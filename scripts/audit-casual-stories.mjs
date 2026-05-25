/**
 * 구어체(casual) 유저 스토리 → 프로덕션 /api/analyze 검증
 * Usage: LAW_TWIN_BASE_URL=https://law-twin.vercel.app node scripts/audit-casual-stories.mjs
 */

import { isLawLikeSearchQuery, lawTitlesMatch, normalizeCompact } from "../lib/lawSearchTerms.js";

const BASE = (process.env.LAW_TWIN_BASE_URL || "https://law-twin.vercel.app").replace(/\/+$/u, "");
const DELAY_MS = Number.parseInt(process.env.LAW_TWIN_AUDIT_DELAY_MS || "800", 10);
const STRICT_ALL = process.env.LAW_TWIN_AUDIT_STRICT === "1";
const lawLikePattern = /(법률|보호법|관리법|기본법|특별법|보장법|보전법|교통법|건축법|민법|상법|형법|법|령|규칙|조례|고시)$/u;

const casualStories = [
  { domain: "labor", scenario: "알바 월급이랑 주휴수당을 얼마나 줘야 하는지 모르겠어. 야근도 시키면 뭐 봐야 해?", expectedAny: ["근로기준법", "최저임금법"] },
  { domain: "labor", scenario: "알바비가 밀렸고 사장님이 내일부터 나오지 말라고 했어. 신고 전에 어떤 법을 봐야 해?", expectedAny: ["근로기준법", "최저임금법"] },
  { domain: "labor", scenario: "직원을 갑자기내도 되는지, 권고사직이면 어떤 절차가 필요한지 알고 싶어.", expectedAny: ["근로기준법"] },
  { domain: "labor", scenario: "공장에서 사람이 다쳤고 보호구도 제대로 안 줬어. 산재랑 작업중지 기준을 찾아줘.", expectedAny: ["산업안전보건법", "중대재해 처벌 등에 관한 법률"] },
  { domain: "privacy", scenario: "고객 전화번호랑 생년월일을 받아서 카톡으로 홍보문자내도 돼?", expectedAny: ["개인정보 보호법", "정보통신망 이용촉진 및 정보보호 등에 관한 법률"], forbiddenAny: ["의료법"] },
  { domain: "privacy", scenario: "회원이 탈퇴했는데 주문 기록이랑 주소를 계속 보관해도 되는지 궁금해.", expectedAny: ["개인정보 보호법"], forbiddenAny: ["의료법"] },
  { domain: "privacy", scenario: "고객 연락처로 광고문자를 보냈는데 수신거부 버튼을 꼭 넣어야 하는지 모르겠어.", expectedAny: ["정보통신망 이용촉진 및 정보보호 등에 관한 법률", "개인정보 보호법"] },
  { domain: "commerce", scenario: "쇼핑몰 상세페이지에 환불 안 된다고 써도 되는지, 리뷰 광고 문구도 같이 봐줘.", expectedAny: ["전자상거래 등에서의 소비자보호에 관한 법률", "표시ㆍ광고의 공정화에 관한 법률", "약관의 규제에 관한 법률"], forbiddenAny: ["의료법"] },
  { domain: "commerce", scenario: "구독 서비스 무료체험 끝나면 자동결제하려고 하는데 약관이랑 고지를 어떻게 해야 해?", expectedAny: ["전자상거래 등에서의 소비자보호에 관한 법률", "약관의 규제에 관한 법률"] },
  { domain: "food", scenario: "작은 식당을 오픈하려는데 배달앱 판매랑 포장판매도 할 거야. 신고가 필요해?", expectedAny: ["식품위생법"] },
  { domain: "food", scenario: "카페에서 술도 조금 팔고 싶은데 미성년자 출입이나 판매 기준이 걱정돼.", expectedAny: ["식품위생법", "청소년 보호법"] },
  { domain: "food", scenario: "푸드트럭으로 장사하려고 하는데 영업신고랑 위생교육을 어디까지 해야 하는지 궁금해.", expectedAny: ["식품위생법"] },
  { domain: "lease", scenario: "집주인이 보증금을 올리겠다고 하는데 세입자가 거절할 수 있는지 궁금해.", expectedAny: ["주택임대차보호법"] },
  { domain: "lease", scenario: "상가 권리금을 못 받게 한다는데 계약서랑 해지 조건을 봐야 할 것 같아.", expectedAny: ["상가건물 임대차보호법", "민법"] },
  { domain: "construction", scenario: "매장 앞에 간판 달고 내부 벽을 철거해서 인테리어하려는데 허가가 필요해?", expectedAny: ["건축법", "옥외광고물 등의 관리와 옥외광고산업 진흥에 관한 법률"] },
  { domain: "construction", scenario: "건물 용도를 바꾸고 일부 해체 공사를 하려는데 신고해야 하는 법을 찾아줘.", expectedAny: ["건축법", "건축물관리법"] },
  { domain: "environment", scenario: "공장에서 냄새랑 소음 민원이 들어왔고 폐수도 조금 나와. 어떤 법을 봐야 해?", expectedAny: ["대기환경보전법", "물환경보전법", "소음ㆍ진동관리법"] },
  { domain: "education", scenario: "학원비 환불이랑 어린이 학원차 운행 기준을 같이 확인하고 싶어.", expectedAny: ["학원의 설립ㆍ운영 및 과외교습에 관한 법률", "도로교통법"] },
  { domain: "education", scenario: "교습소를 열려는데 수강료 게시랑 강사 등록을 어떻게 해야 해?", expectedAny: ["학원의 설립ㆍ운영 및 과외교습에 관한 법률"] },
  { domain: "healthcare", scenario: "환자 진료기록을 앱에 저장하고 병원 광고도 하려는데 어떤 법을 봐야 할까?", expectedAny: ["의료법", "개인정보 보호법"] },
  { domain: "fire", scenario: "가게에 소화기랑 화재경보기, 비상구 표시를 어디까지 해야 하는지 모르겠어.", expectedAny: ["소방시설 설치 및 관리에 관한 법률", "화재의 예방 및 안전관리에 관한 법률"] },
  { domain: "tax", scenario: "프리랜서에게 돈 줄 때 원천세 떼야 하는지, 세금계산서나 현금영수증도 궁금해.", expectedAny: ["소득세법", "부가가치세법"] },
];

const extraVague = [
  { domain: "vague-labor", scenario: "회사에서 뭔가 바꾸려는데 직원들이랑 싸울 것 같아. 뭐부터 봐야 해?", expectedAny: ["근로기준법"] },
  { domain: "vague-shop", scenario: "인터넷으로 뭔가 팔 건데 법적으로 뭐 걸릴까?", expectedAny: ["전자상거래 등에서의 소비자보호에 관한 법률"] },
  { domain: "vague-home", scenario: "전세 살고 있는데 집주인이 이상해. 도와줘.", expectedAny: ["주택임대차보호법"] },
  { domain: "vague-fire", scenario: "가게 문 열려고 하는데 안전 쪽으로 뭐 해야 돼?", expectedAny: ["소방시설 설치 및 관리에 관한 법률", "화재의 예방 및 안전관리에 관한 법률"] },
];

const stories = [...casualStories, ...extraVague];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesAny(haystack, names) {
  const flat = normalizeCompact(haystack);
  return names.some((name) => flat.includes(normalizeCompact(name)));
}

function lawTitleMatches(title, expectedName) {
  return lawTitlesMatch(title, expectedName);
}

async function analyze(scenario) {
  const response = await fetch(`${BASE}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario, sector: "auto", region: "auto", mode: "impact" }),
  });
  const body = await response.json();
  return { ok: response.ok, status: response.status, body };
}

const results = [];

for (const story of stories) {
  await sleep(DELAY_MS);
  const { ok, status, body } = await analyze(story.scenario);
  const queries = body.searchQueries || [];
  const planned = body.lawSearchPlan?.queries || [];
  const laws = body.laws || [];
  const lawApiItems = body.lawApi?.items || [];
  const topLawTitles = laws.slice(0, 8).map((l) => l.title);
  const lawApiTitles = lawApiItems.map((i) => i.title);

  const haystackLoose = [queries, planned, topLawTitles, lawApiTitles].flat().join("|");
  const haystackStrictLaws = topLawTitles.join("|");

  const loosePass = story.expectedAny ? matchesAny(haystackLoose, story.expectedAny) : true;
  const strictPass = story.expectedAny
    ? story.expectedAny.every((name) => topLawTitles.some((t) => lawTitleMatches(t, name)))
    : true;

  const missingExpected = (story.expectedAny || []).filter(
    (name) => !matchesAny(haystackLoose, [name]) && !topLawTitles.some((t) => lawTitleMatches(t, name)),
  );

  const missingInTopLaws = (story.expectedAny || []).filter((name) => !topLawTitles.some((t) => lawTitleMatches(t, name)));
  const badQueries = queries.filter((query) => !isLawLikeSearchQuery(query));

  const forbiddenHit = (story.forbiddenAny || []).filter((name) =>
    topLawTitles.slice(0, 6).some((t) => lawTitleMatches(t, name)),
  );

  const queryCoverage = queries.map((q) => {
    const matched = lawApiItems.filter((item) => normalizeCompact(item.matchedQuery) === normalizeCompact(q));
    return { query: q, apiHits: matched.length, sample: matched[0]?.title };
  });

  const emptyApiQueries = queryCoverage.filter((q) => q.apiHits === 0);

  results.push({
    domain: story.domain,
    scenario: story.scenario.slice(0, 48) + (story.scenario.length > 48 ? "…" : ""),
    httpOk: ok,
    status,
    labels: body.labels,
    searchQueries: queries,
    plannedQueries: planned,
    topLawTitles,
    lawApiCount: lawApiItems.length,
    lawApiError: body.lawApi?.error,
    lawApiErrors: (body.lawApi?.errors || []).length,
    loosePass,
    strictPass,
    missingExpected,
    missingInTopLaws,
    forbiddenHit,
    emptyApiQueries,
    badQueries,
    geminiPlanError: body.lawSearchPlan?.error,
    integrations: body.integrations,
  });
}

const officialResults = results.filter((r) => !r.domain.startsWith("vague"));
const summary = {
  baseUrl: BASE,
  total: results.length,
  httpFail: results.filter((r) => !r.httpOk).length,
  officialCount: officialResults.length,
  loosePass: officialResults.filter((r) => r.loosePass).length,
  strictAllPass: officialResults.filter((r) => r.strictPass).length,
  looseFail: officialResults.filter((r) => !r.loosePass).map((r) => r.domain),
  strictFail: officialResults.filter((r) => !r.strictPass).map((r) => ({ domain: r.domain, missingInTopLaws: r.missingInTopLaws, topLawTitles: r.topLawTitles.slice(0, 4) })),
  badQueryStories: officialResults.filter((r) => r.badQueries?.length).map((r) => ({ domain: r.domain, badQueries: r.badQueries })),
  forbiddenHits: results.filter((r) => r.forbiddenHit.length).map((r) => ({ domain: r.domain, forbidden: r.forbiddenHit })),
  emptyApiQueryStories: results.filter((r) => r.emptyApiQueries.length).map((r) => ({ domain: r.domain, empty: r.emptyApiQueries })),
  lawApiErrors: results.filter((r) => r.lawApiError || r.lawApiErrors).length,
  zeroLawApi: results.filter((r) => r.lawApiCount === 0).map((r) => r.domain),
};

console.log(JSON.stringify({ summary, results }, null, 2));

const shouldFail =
  summary.httpFail > 0 ||
  summary.looseFail.length > 0 ||
  (STRICT_ALL ? summary.strictFail.length > 0 : false) ||
  summary.badQueryStories.length > 0;

if (shouldFail) {
  process.exit(1);
}
