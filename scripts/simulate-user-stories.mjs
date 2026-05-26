const lawLikePattern = /(법률|보호법|관리법|기본법|특별법|보장법|보전법|교통법|건축법|민법|상법|형법|법|령|규칙|조례|고시)$/u;
const ignoredStandaloneTerms = new Set([
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
const staleResultHints = ["구직자 취업촉진", "유해ㆍ위험작업", "학자금"];

const domains = [
  {
    name: "labor",
    subjects: ["스타트업", "제조업체", "플랫폼 회사"],
    actions: ["포괄임금제를 폐지하고 선택근로제를 도입", "연장근로와 야간수당 산정을 변경", "취업규칙을 개정하고 근로자 동의 절차를 확인"],
    details: ["최저임금 산정", "근로자대표 서면합의", "급여명세서"],
  },
  {
    name: "privacy",
    subjects: ["온라인 쇼핑몰", "병원 예약 앱", "학원"],
    actions: ["개인정보 처리방침을 바꾸고 위탁사를 추가", "CCTV와 민감정보 수집 절차를 점검", "회원정보 보관기간과 파기 기준을 변경"],
    details: ["동의", "제3자 제공", "처리위탁"],
  },
  {
    name: "commerce",
    subjects: ["통신판매업자", "라이브커머스 판매자", "구독 서비스"],
    actions: ["환불 규정과 청약철회 문구를 변경", "표시광고 문구를 점검", "상품 정보 제공 방식을 바꾸려고 함"],
    details: ["소비자 고지", "약관", "정기결제"],
  },
  {
    name: "food",
    subjects: ["카페", "배달 음식점", "푸드트럭"],
    actions: ["영업신고와 위생교육을 준비", "원산지 표시와 배달 판매 기준을 점검", "미성년자 고용과 주방 시설기준을 확인"],
    details: ["식품위생", "원산지", "영업자 준수사항"],
  },
  {
    name: "lease",
    subjects: ["오피스텔 임차인", "상가 임대인", "전세 세입자"],
    actions: ["계약갱신과 보증금 증액을 검토", "권리금 회수와 임대차 해지를 확인", "전입신고와 확정일자 절차를 확인"],
    details: ["임대차보호법", "민법", "중개수수료"],
  },
  {
    name: "construction",
    subjects: ["건물주", "인테리어 회사", "공장"],
    actions: ["용도변경과 리모델링 허가를 검토", "증축과 사용승인을 준비", "건축허가와 지자체 조례를 확인"],
    details: ["건축법", "건축물관리법", "안전점검"],
  },
  {
    name: "environment",
    subjects: ["공장", "폐기물 배출 사업장", "도장 시설"],
    actions: ["대기배출시설 설치 신고를 준비", "폐기물 위탁처리 절차를 점검", "방지시설 운영기록을 정리"],
    details: ["대기환경보전법", "폐기물관리법", "측정기록"],
  },
  {
    name: "education",
    subjects: ["학원", "교습소", "어린이 통학버스 운영자"],
    actions: ["학원법과 교습비 게시 기준을 확인", "도로교통법과 통학버스 신고를 점검", "안전교육과 강사 기준을 정리"],
    details: ["학원법", "도로교통법", "보호구역"],
  },
  {
    name: "fire",
    subjects: ["소방대상물 관리자", "건물주", "다중이용업소"],
    actions: ["스프링클러 설치 기준을 확인", "소방시설 자체점검과 보고를 준비", "화재예방 기준과 피난 설비를 점검"],
    details: ["소방법", "소방시설공사업법", "화재예방법"],
  },
  {
    name: "tax",
    subjects: ["개인사업자", "프리랜서 플랫폼", "온라인 판매자"],
    actions: ["부가세 신고와 세금계산서 발급을 확인", "원천징수와 사업소득 처리를 검토", "사업자등록과 면세 여부를 정리"],
    details: ["부가가치세법", "소득세법", "증빙"],
  },
];

const casualStories = [
  {
    domain: "labor",
    scenario: "알바 월급이랑 주휴수당을 얼마나 줘야 하는지 모르겠어. 야근도 시키면 뭐 봐야 해?",
    expectedAny: ["근로기준법", "최저임금법"],
  },
  {
    domain: "labor",
    scenario: "알바비가 밀렸고 사장님이 내일부터 나오지 말라고 했어. 신고 전에 어떤 법을 봐야 해?",
    expectedAny: ["근로기준법", "최저임금법"],
  },
  {
    domain: "labor",
    scenario: "직원을 갑자기 내보내도 되는지, 권고사직이면 어떤 절차가 필요한지 알고 싶어.",
    expectedAny: ["근로기준법"],
  },
  {
    domain: "labor",
    scenario: "공장에서 사람이 다쳤고 보호구도 제대로 안 줬어. 산재랑 작업중지 기준을 찾아줘.",
    expectedAny: ["산업안전보건법", "중대재해 처벌 등에 관한 법률"],
  },
  {
    domain: "labor",
    scenario: "5인미만 사업체에서 대표가 근무 중 다쳤을 때",
    expectedAny: ["산업안전보건법", "산업재해보상보험법", "근로기준법"],
    forbiddenAny: ["행정절차법"],
  },
  {
    domain: "privacy",
    scenario: "고객 전화번호랑 생년월일을 받아서 카톡으로 홍보문자 보내도 돼?",
    expectedAny: ["개인정보 보호법", "정보통신망 이용촉진 및 정보보호 등에 관한 법률"],
    forbiddenAny: ["의료법"],
  },
  {
    domain: "privacy",
    scenario: "회원이 탈퇴했는데 주문 기록이랑 주소를 계속 보관해도 되는지 궁금해.",
    expectedAny: ["개인정보 보호법"],
    forbiddenAny: ["의료법"],
  },
  {
    domain: "privacy",
    scenario: "고객 연락처로 광고문자를 보냈는데 수신거부 버튼을 꼭 넣어야 하는지 모르겠어.",
    expectedAny: ["정보통신망 이용촉진 및 정보보호 등에 관한 법률", "개인정보 보호법"],
  },
  {
    domain: "commerce",
    scenario: "쇼핑몰 상세페이지에 환불 안 된다고 써도 되는지, 리뷰 광고 문구도 같이 봐줘.",
    expectedAny: ["전자상거래 등에서의 소비자보호에 관한 법률", "표시ㆍ광고의 공정화에 관한 법률", "약관의 규제에 관한 법률"],
    forbiddenAny: ["의료법"],
  },
  {
    domain: "commerce",
    scenario: "구독 서비스 무료체험 끝나면 자동결제하려고 하는데 약관이랑 고지를 어떻게 해야 해?",
    expectedAny: ["전자상거래 등에서의 소비자보호에 관한 법률", "약관의 규제에 관한 법률"],
  },
  {
    domain: "food",
    scenario: "작은 식당을 오픈하려는데 배달앱 판매랑 포장판매도 할 거야. 신고가 필요해?",
    expectedAny: ["식품위생법"],
  },
  {
    domain: "food",
    scenario: "카페에서 술도 조금 팔고 싶은데 미성년자 출입이나 판매 기준이 걱정돼.",
    expectedAny: ["식품위생법", "청소년 보호법"],
  },
  {
    domain: "food",
    scenario: "푸드트럭으로 장사하려고 하는데 영업신고랑 위생교육을 어디까지 해야 하는지 궁금해.",
    expectedAny: ["식품위생법"],
  },
  {
    domain: "lease",
    scenario: "집주인이 보증금을 올리겠다고 하는데 세입자가 거절할 수 있는지 궁금해.",
    expectedAny: ["주택임대차보호법"],
  },
  {
    domain: "lease",
    scenario: "상가 권리금을 못 받게 한다는데 계약서랑 해지 조건을 봐야 할 것 같아.",
    expectedAny: ["상가건물 임대차보호법", "민법"],
  },
  {
    domain: "construction",
    scenario: "매장 앞에 간판 달고 내부 벽을 철거해서 인테리어하려는데 허가가 필요해?",
    expectedAny: ["건축법", "옥외광고물 등의 관리와 옥외광고산업 진흥에 관한 법률"],
  },
  {
    domain: "construction",
    scenario: "건물 용도를 바꾸고 일부 해체 공사를 하려는데 신고해야 하는 법을 찾아줘.",
    expectedAny: ["건축법", "건축물관리법"],
  },
  {
    domain: "environment",
    scenario: "공장에서 냄새랑 소음 민원이 들어왔고 폐수도 조금 나와. 어떤 법을 봐야 해?",
    expectedAny: ["대기환경보전법", "물환경보전법", "소음ㆍ진동관리법"],
  },
  {
    domain: "education",
    scenario: "학원비 환불이랑 어린이 학원차 운행 기준을 같이 확인하고 싶어.",
    expectedAny: ["학원의 설립ㆍ운영 및 과외교습에 관한 법률", "도로교통법"],
  },
  {
    domain: "education",
    scenario: "교습소를 열려는데 수강료 게시랑 강사 등록을 어떻게 해야 해?",
    expectedAny: ["학원의 설립ㆍ운영 및 과외교습에 관한 법률"],
  },
  {
    domain: "healthcare",
    scenario: "환자 진료기록을 앱에 저장하고 병원 광고도 하려는데 어떤 법을 봐야 할까?",
    expectedAny: ["의료법", "개인정보 보호법"],
  },
  {
    domain: "fire",
    scenario: "가게에 소화기랑 화재경보기, 비상구 표시를 어디까지 해야 하는지 모르겠어.",
    expectedAny: ["소방시설 설치 및 관리에 관한 법률", "화재의 예방 및 안전관리에 관한 법률"],
  },
  {
    domain: "tax",
    scenario: "프리랜서에게 돈 줄 때 원천세 떼야 하는지, 세금계산서나 현금영수증도 궁금해.",
    expectedAny: ["소득세법", "부가가치세법"],
  },
];

const regions = ["서울", "경기", "부산", "전국"];
const modes = ["impact", "conflict", "checklist"];

const options = parseOptions(process.argv.slice(2));
const runCount = options.forever ? Number.POSITIVE_INFINITY : options.repeat;
let totalCount = 0;

for (let iteration = 1; iteration <= runCount; iteration += 1) {
  const stories = buildStories(iteration);
  const failures = [];

  for (const story of stories) {
    const result = await analyzeStory(story);
    failures.push(...validateResult(story, result));
  }

  totalCount += stories.length;
  if (failures.length) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          baseUrl: options.baseUrl,
          iteration,
          totalCount,
          failureCount: failures.length,
          failures: failures.slice(0, 50),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, baseUrl: options.baseUrl, iteration, count: stories.length, totalCount }));
}

function parseOptions(args) {
  const options = {
    baseUrl: process.env.LAW_TWIN_BASE_URL || "http://localhost:3007",
    repeat: Number.parseInt(process.env.LAW_TWIN_SIM_REPEAT || "1", 10),
    limit: Number.parseInt(process.env.LAW_TWIN_SIM_LIMIT || "0", 10),
    forever: false,
    casualOnly: false,
  };

  args.forEach((arg) => {
    if (arg === "--forever") options.forever = true;
    if (arg === "--casual-only") options.casualOnly = true;
    if (arg.startsWith("--repeat=")) options.repeat = Number.parseInt(arg.slice("--repeat=".length), 10);
    if (arg.startsWith("--limit=")) options.limit = Number.parseInt(arg.slice("--limit=".length), 10);
    if (arg.startsWith("--base-url=")) options.baseUrl = arg.slice("--base-url=".length).replace(/\/+$/u, "");
  });

  if (!Number.isFinite(options.repeat) || options.repeat < 1) options.repeat = 1;
  if (!Number.isFinite(options.limit) || options.limit < 0) options.limit = 0;
  return options;
}

function buildStories(iteration) {
  const stories = [];
  if (!options.casualOnly) {
    for (const domain of domains) {
      for (const subject of domain.subjects) {
        for (const action of domain.actions) {
          for (const detail of domain.details) {
            for (const region of regions) {
              for (const mode of modes) {
                stories.push({
                  domain: domain.name,
                  mode,
                  scenario: `${region} 소재 ${subject}이 ${action}하려고 합니다. ${detail} 관련 법령과 신고, 동의, 고지 절차를 자연어로 찾아줘. 반복 ${iteration}`,
                });
              }
            }
          }
        }
      }
    }
  }

  for (const casualStory of casualStories) {
    for (const mode of modes) {
      stories.push({
        ...casualStory,
        mode,
        scenario: `${casualStory.scenario} 반복 ${iteration}`,
      });
    }
  }

  return options.limit > 0 ? stories.slice(0, options.limit) : stories;
}

async function analyzeStory(story) {
  try {
    const response = await fetch(`${options.baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenario: story.scenario,
        sector: "auto",
        region: "auto",
        mode: story.mode,
      }),
    });
    const body = await response.json();
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: { error: error instanceof Error ? error.message : "request failed" } };
  }
}

function validateResult(story, result) {
  const failures = [];
  const body = result.body || {};

  if (!result.ok) failures.push({ type: "http", story, status: result.status, body });

  const queries = body.searchQueries || [];
  const badQueries = queries.filter((query) => ignoredStandaloneTerms.has(normalizeCompact(query)) || !lawLikePattern.test(String(query || "").trim()));
  if (badQueries.length) failures.push({ type: "badQueries", story, badQueries, queries });

  const plannedQueries = body.lawSearchPlan?.queries || [];
  const badPlannedQueries = plannedQueries.filter(
    (query) => ignoredStandaloneTerms.has(normalizeCompact(query)) || !lawLikePattern.test(String(query || "").trim()),
  );
  if (badPlannedQueries.length) failures.push({ type: "badPlannedQueries", story, badPlannedQueries, plannedQueries });

  if (!body.laws?.length) failures.push({ type: "emptyLaws", story, queries, topics: body.labels?.topics });
  if (!body.checklist?.length) failures.push({ type: "emptyChecklist", story, queries });
  if (!body.graph?.nodes?.length || !body.graph?.edges?.length) failures.push({ type: "badGraph", story, graph: body.graph });
  if (containsStaleResults(body)) failures.push({ type: "staleResultHints", story, laws: body.laws?.map((law) => law.title) });
  if (story.expectedAny?.length && !matchesExpectedLaw(body, story.expectedAny)) {
    failures.push({
      type: "missingExpectedLaw",
      story,
      expectedAny: story.expectedAny,
      queries,
      plannedQueries: body.lawSearchPlan?.queries || [],
      laws: body.laws?.map((law) => law.title),
    });
  }
  if (story.forbiddenAny?.length && matchesForbiddenLaw(body, story.forbiddenAny)) {
    failures.push({
      type: "unexpectedLaw",
      story,
      forbiddenAny: story.forbiddenAny,
      laws: body.laws?.map((law) => law.title),
    });
  }

  return failures;
}

function containsStaleResults(body) {
  const haystack = JSON.stringify({
    queries: body.searchQueries,
    plannedQueries: body.lawSearchPlan?.queries,
    laws: body.laws?.map((law) => law.title),
  });
  return staleResultHints.some((hint) => haystack.includes(hint));
}

function matchesExpectedLaw(body, expectedAny) {
  const haystack = [
    ...(body.searchQueries || []),
    ...(body.lawSearchPlan?.queries || []),
    ...(body.laws || []).map((law) => law.title),
  ]
    .map(normalizeCompact)
    .join("|");

  return expectedAny.some((lawName) => haystack.includes(normalizeCompact(lawName)));
}

function matchesForbiddenLaw(body, forbiddenAny) {
  const haystack = (body.laws || [])
    .slice(0, 6)
    .map((law) => normalizeCompact(law.title))
    .join("|");

  return forbiddenAny.some((lawName) => haystack.includes(normalizeCompact(lawName)));
}

function normalizeCompact(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "");
}
