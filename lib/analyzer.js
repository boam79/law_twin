import { lawData, regionLabels, sectorLabels, topicLabels } from "./lawData.js";
import {
  canonicalizeLawQuery,
  canonicalizeSearchQueries,
  expandLawAliasQueries,
  ignoredStandaloneLawQueries,
  isGarbageLawQuery,
  isLawLikeSearchQuery,
  isSentenceLikeLawQuery,
  lawTitlesMatch,
  scoreLawTitleForQuery,
} from "./lawSearchTerms.js";

const topicKeywords = {
  labor: ["노동", "근로", "근무", "직원", "사업장", "사업체", "대표", "사장", "노무", "인사", "취업규칙", "포괄임금", "고용", "알바", "아르바이트", "해고", "권고사직", "퇴사", "채용", "연차"],
  hours: ["근로시간", "연장근로", "야간", "휴일", "휴게", "교대제", "선택근로", "탄력근로", "야근", "주말근무", "출퇴근", "근태", "휴가"],
  wages: ["임금", "급여", "수당", "최저임금", "통상임금", "상여금", "퇴직급여", "퇴직금", "월급", "시급", "주휴", "주휴수당", "체불", "임금체불", "알바비", "야근수당"],
  safety: ["안전", "산업안전", "안전보건", "위험성평가", "보호구역", "통학버스", "시설기준", "산재", "사고", "보호구", "중대재해", "작업중지", "안전교육", "다치", "다쳤", "부상", "재해", "5인", "5인미만", "5인 미만"],
  privacy: [
    "개인정보",
    "민감정보",
    "회원정보",
    "고객정보",
    "처리방침",
    "CCTV",
    "영상정보",
    "전화번호",
    "휴대폰번호",
    "핸드폰번호",
    "연락처",
    "이름",
    "주민번호",
    "생년월일",
    "회원탈퇴",
    "탈퇴",
    "주소",
    "주문기록",
    "고객명단",
    "마케팅문자",
    "광고문자",
    "홍보문자",
    "수신거부",
    "카톡",
  ],
  commerce: ["전자상거래", "통신판매", "쇼핑몰", "온라인", "판매", "배달", "사업자등록", "반품", "배송", "정기결제", "자동결제", "구독", "무료체험", "상세페이지", "리뷰", "광고"],
  consumer: ["소비자", "환불", "교환", "청약철회", "표시광고", "약관", "반품", "불량", "하자", "리뷰", "허위광고"],
  food: ["식품", "위생", "카페", "음식점", "영업신고", "원산지", "주방", "식당", "배달앱", "포장판매", "주류", "술", "술판매", "미성년자", "푸드트럭"],
  lease: ["임대차", "전세", "월세", "보증금", "계약갱신", "확정일자", "전입신고", "권리금", "집주인", "세입자", "전세금", "묵시적갱신", "관리비"],
  realestate: ["부동산", "상가", "오피스텔", "주택", "중개", "매매", "임대인", "임차인", "집주인", "세입자", "중개수수료"],
  contract: ["계약", "해지", "손해배상", "위약금", "채권", "채무", "계약서", "동의서", "취소", "해약"],
  construction: ["건축", "리모델링", "증축", "용도변경", "건축허가", "사용승인", "공사", "인테리어", "간판", "철거", "가벽", "내부공사", "불법건축"],
  tax: ["세금", "세무", "부가세", "부가가치세", "소득세", "원천징수", "세금계산서", "종합소득세", "현금영수증", "간이과세", "원천세", "종소세", "프리랜서"],
  environment: ["환경", "대기", "폐기물", "배출시설", "오염", "방지시설", "굴뚝", "폐수", "악취", "냄새", "소음", "진동", "분진", "매연"],
  traffic: ["교통", "도로", "차량", "운전", "통학버스", "보호구역", "학원차", "통학차", "어린이차", "운전기사"],
  education: ["학원", "교습소", "과외", "교습비", "강사", "학교", "통학차량", "학원버스", "학원비", "강사등록", "수강료"],
  healthcare: ["의료", "의료기관", "병원", "의원", "환자", "진료", "요양", "응급", "진료기록", "처방전", "의료광고", "응급실", "비대면진료"],
  fire: ["소방", "소방법", "소방시설", "스프링클러", "화재", "피난", "방화", "소화설비", "소화기", "경보기", "감지기", "비상구", "소방점검"],
  permit: ["인허가", "허가", "신고", "등록", "승인", "영업신고", "설립", "창업", "개업", "오픈", "가게", "영업", "허가필요", "신고해야"],
  amendment: ["개정", "변경", "최신", "신설", "개편", "폐지", "도입", "갱신"],
  local: ["서울", "경기", "부산", "지자체", "조례", "자치법규", "지역", "관할"],
  outsourcing: ["도급", "위탁", "수탁", "외주", "협력업체"],
  reporting: ["신고", "보고", "제출", "관할", "자료"],
  records: ["기록", "보존", "보관", "파기", "로그", "명세서", "이력", "증빙"],
  notice: ["공문", "통지", "처분", "의견제출", "동의", "공지", "절차", "고지"],
};

const regionKeywords = {
  seoul: ["서울", "강남", "서초", "송파"],
  gyeonggi: ["경기", "수원", "성남", "용인", "고양"],
  busan: ["부산", "해운대", "동래"],
  nationwide: ["전국", "국가", "중앙"],
};

const sectorKeywords = {
  workplace: [
    "노동",
    "근로",
    "근무",
    "직원",
    "사업장",
    "사업체",
    "대표",
    "사장",
    "노무",
    "인사",
    "임금",
    "급여",
    "취업규칙",
    "산업안전",
    "안전보건",
    "포괄임금",
    "알바",
    "아르바이트",
    "월급",
    "시급",
    "해고",
    "연차",
    "산재",
    "보호구",
    "작업중지",
    "위험성평가",
    "중대재해",
    "끼임사고",
    "추락사고",
    "5인",
    "5인미만",
    "5인 미만",
    "다치",
    "다쳤",
    "부상",
    "재해",
  ],
  enterprise: ["기업", "회사", "준법", "사업자", "쇼핑몰", "통신판매", "계약", "소비자", "세무", "구독", "정기결제", "약관", "리뷰", "광고"],
  public: ["공공기관", "지자체", "행정", "민원", "주민", "공무원", "처분", "공문"],
  privacy: ["개인정보", "처리방침", "CCTV", "회원정보", "고객정보", "전화번호", "휴대폰번호", "핸드폰번호", "연락처", "주민번호", "회원탈퇴", "탈퇴", "주소", "주문기록", "마케팅문자", "광고문자", "홍보문자"],
  realestate: ["부동산", "임대차", "전세", "월세", "상가", "오피스텔", "주택", "권리금", "집주인", "세입자", "보증금"],
  tax: ["세금", "세무", "부가세", "소득세", "원천징수", "세금계산서", "현금영수증", "간이과세", "프리랜서"],
  food: ["식품", "위생", "카페", "음식점", "영업신고", "원산지", "식당", "배달앱", "주류", "포장판매"],
  construction: ["건축", "리모델링", "증축", "용도변경", "건축허가", "공사", "인테리어", "간판", "철거", "불법건축"],
  environment: ["환경", "폐기물", "대기", "배출시설", "오염", "폐수", "악취", "냄새", "소음"],
  traffic: ["교통", "도로", "차량", "통학버스", "운전", "학원차", "어린이차"],
  education: ["학원", "교습소", "교습비", "강사", "학교", "통학차량", "학원버스", "학원비", "수강료"],
  healthcare: ["의료", "의료기관", "병원", "의원", "환자", "진료", "요양", "응급", "진료기록", "의료광고"],
  fire: ["소방", "소방법", "소방시설", "스프링클러", "화재", "피난", "방화", "소화기", "비상구", "경보기"],
};

const topicSearchFallback = {
  labor: "근로기준법",
  hours: "근로기준법",
  wages: "최저임금법",
  safety: "산업안전보건법",
  privacy: "개인정보 보호법",
  commerce: "전자상거래 등에서의 소비자보호에 관한 법률",
  consumer: "소비자기본법",
  food: "식품위생법",
  lease: "주택임대차보호법",
  realestate: "상가건물 임대차보호법",
  contract: "민법",
  construction: "건축법",
  tax: "부가가치세법",
  environment: "대기환경보전법",
  traffic: "도로교통법",
  education: "학원의 설립ㆍ운영 및 과외교습에 관한 법률",
  healthcare: "의료법",
  fire: "소방시설 설치 및 관리에 관한 법률",
  permit: "행정절차법",
};

const queryExpansionRules = [
  {
    terms: ["포괄임금", "포괄임금제", "선택근로", "선택근로제", "선택적근로시간", "연장근로", "야간수당", "취업규칙", "근로자대표"],
    queries: ["근로기준법", "최저임금법"],
  },
  {
    terms: ["알바", "아르바이트", "알바비", "시급", "주휴", "주휴수당", "월급", "월급밀림", "임금체불", "체불", "퇴직금", "해고", "권고사직", "연차", "휴가", "야근", "주말근무"],
    queries: ["근로기준법", "최저임금법"],
  },
  {
    terms: ["전화번호", "휴대폰번호", "핸드폰번호", "연락처", "주민번호", "생년월일", "고객명단", "회원탈퇴", "마케팅문자", "광고문자", "홍보문자", "카톡", "문자발송", "수신거부"],
    queries: ["개인정보 보호법", "정보통신망 이용촉진 및 정보보호 등에 관한 법률"],
  },
  {
    terms: ["회원 탈퇴", "탈퇴", "주문기록", "고객주소", "주소 보관", "보관기간", "파기"],
    queries: ["개인정보 보호법"],
  },
  {
    terms: ["환불", "반품", "교환", "청약철회", "정기결제", "자동결제", "구독", "무료체험", "상세페이지", "리뷰", "허위광고", "광고문구", "약관"],
    queries: ["전자상거래 등에서의 소비자보호에 관한 법률", "표시ㆍ광고의 공정화에 관한 법률", "약관의 규제에 관한 법률"],
  },
  {
    terms: ["식당", "음식점", "카페", "배달앱", "포장판매", "주류", "술판매", "원산지", "미성년자"],
    queries: ["식품위생법", "청소년 보호법"],
  },
  {
    terms: ["집주인", "세입자", "보증금", "월세", "전세", "전세금", "권리금", "관리비", "묵시적갱신", "계약갱신"],
    queries: ["주택임대차보호법", "상가건물 임대차보호법", "민법"],
  },
  {
    terms: ["간판", "인테리어", "벽철거", "철거", "가벽", "내부공사", "불법건축", "용도변경", "리모델링"],
    queries: ["건축법", "건축물관리법", "옥외광고물 등의 관리와 옥외광고산업 진흥에 관한 법률"],
  },
  {
    terms: ["폐수", "악취", "냄새", "소음", "진동", "분진", "매연", "폐기물", "배출시설"],
    queries: ["대기환경보전법", "물환경보전법", "폐기물관리법", "소음ㆍ진동관리법"],
  },
  {
    terms: ["학원비", "수강료", "교습비", "학원차", "통학차", "어린이차", "강사등록"],
    queries: ["학원의 설립ㆍ운영 및 과외교습에 관한 법률", "도로교통법"],
  },
  {
    terms: ["진료기록", "환자정보", "의료광고", "응급실", "처방전", "비대면진료"],
    queries: ["의료법", "응급의료에 관한 법률", "개인정보 보호법"],
  },
  {
    terms: ["소화기", "경보기", "감지기", "비상구", "피난구", "소방점검", "소방안전관리"],
    queries: ["소방시설 설치 및 관리에 관한 법률", "화재의 예방 및 안전관리에 관한 법률"],
  },
  {
    terms: ["세금계산서", "현금영수증", "부가세", "원천세", "종소세", "종합소득세", "프리랜서", "간이과세", "면세"],
    queries: ["부가가치세법", "소득세법"],
  },
  {
    terms: ["산재", "작업중지", "보호구", "위험성평가", "안전교육", "중대재해", "끼임사고", "추락사고"],
    queries: ["산업안전보건법", "중대재해 처벌 등에 관한 법률"],
  },
  {
    terms: ["다치", "다쳤", "부상", "재해", "근무", "5인미만", "5인 미만", "사업체", "대표"],
    queries: ["산업안전보건법", "산업재해보상보험법", "근로기준법"],
  },
  {
    terms: ["소방법", "소방", "소방시설", "스프링클러", "화재", "피난", "방화"],
    queries: [
      "소방시설 설치 및 관리에 관한 법률",
      "화재의 예방 및 안전관리에 관한 법률",
      "소방시설공사업법",
      "다중이용업소의 안전관리에 관한 특별법",
    ],
  },
  {
    terms: ["의료기관", "병원", "의원", "의료", "환자", "진료", "요양"],
    queries: ["의료법", "응급의료에 관한 법률"],
  },
  {
    terms: ["건축", "건물", "용도변경", "사용승인", "증축", "리모델링"],
    queries: ["건축법", "건축물관리법"],
  },
  {
    terms: ["개인정보", "회원정보", "고객정보", "cctv", "영상정보"],
    queries: ["개인정보 보호법", "개인정보보호법"],
  },
  {
    terms: ["통신판매", "전자상거래", "환불", "청약철회", "쇼핑몰"],
    queries: ["전자상거래 등에서의 소비자보호에 관한 법률", "표시ㆍ광고의 공정화에 관한 법률"],
  },
  {
    terms: ["인터넷", "온라인", "쇼핑몰", "팔 건데", "판매하려", "통신판매"],
    queries: ["전자상거래 등에서의 소비자보호에 관한 법률", "표시ㆍ광고의 공정화에 관한 법률"],
  },
  {
    terms: ["임대차", "전세", "월세", "보증금", "권리금", "상가"],
    queries: ["주택임대차보호법", "상가건물 임대차보호법", "민법"],
  },
  {
    terms: ["대기", "폐기물", "배출시설", "오염", "환경"],
    queries: ["대기환경보전법", "폐기물관리법", "물환경보전법"],
  },
];

const broadProcessTopics = new Set(["permit", "reporting", "records", "notice", "amendment", "local", "contract", "outsourcing"]);

const stopTokens = new Set([
  "관련",
  "법령",
  "기준",
  "절차",
  "확인",
  "검토",
  "정리",
  "하려고",
  "합니다",
  "싶습니다",
  "그리고",
  "대해서",
  "위해서",
  "소재",
  "스타트업",
  "폐지",
  "도입",
  "변경",
  "포괄임금제",
  "선택근로제",
  "연장근로",
  "야간수당",
  "취업규칙",
  "서울",
  "경기",
  "부산",
  "전국",
]);

export function analyzeScenario({ scenario, sector = "auto", region = "auto", mode = "impact" }) {
  const query = String(scenario || "").trim();
  const conditions = extractConditions(query, sector, region, mode);
  let laws = rankLaws(query, conditions, mode).slice(0, 6);
  if (!laws.length) {
    laws = rankLaws(query, conditions, mode, 18).slice(0, 6);
  }
  const searchQueries = buildSearchQueries(query, conditions, laws);
  if (!laws.length) {
    laws = anchorLocalLawsFromQueries(searchQueries).slice(0, 6);
  }
  const conflicts = detectConflicts(laws, conditions, mode);
  const checklist = buildChecklist(laws, conflicts, conditions);
  const heatmap = buildHeatmap(laws, conditions);
  const risk = calculateRisk(laws, conflicts, conditions);

  return {
    query,
    searchQueries,
    conditions,
    labels: {
      sector: sectorLabels[conditions.sector] || sectorLabels.general,
      region: regionLabels[conditions.region],
      topics: conditions.topics.map((topic) => topicLabels[topic] || topic),
    },
    laws,
    conflicts,
    checklist,
    heatmap,
    risk,
    graph: buildGraph(laws, checklist, conflicts, conditions),
  };
}

export function buildEmergencySearchQueries(conditions, searchQueries = [], scenario = "") {
  const seen = new Set(canonicalizeSearchQueries(searchQueries).map((query) => normalize(query)));
  const emergency = [];

  const add = (value) => {
    const query = canonicalizeLawQuery(String(value || "").trim());
    if (!query || !isLawLikeSearchQuery(query) || isGarbageLawQuery(query) || isSentenceLikeLawQuery(query)) return;
    if (ignoredStandaloneLawQueries.has(normalize(query))) return;
    const key = normalize(query);
    if (seen.has(key)) return;
    seen.add(key);
    emergency.push(query);
  };

  getTopicFallbackQueries(conditions).forEach(add);

  const text = normalize(scenario);
  if (/(계약|계약서|해지|위약)/u.test(text)) add("민법");
  if (/(개인정보|전화번호|연락처|탈퇴|홍보)/u.test(text)) add("개인정보 보호법");
  if (/(환불|쇼핑|판매|구독)/u.test(text)) add("전자상거래 등에서의 소비자보호에 관한 법률");

  return emergency.slice(0, 6);
}

export function hydrateAnalysisWithLiveLaws(analysis, lawApi, mode = "impact") {
  const liveLaws = buildLiveLaws(lawApi?.items || [], analysis.conditions, analysis.searchQueries);
  const localHighConfidence = analysis.laws.filter((law) => law.score >= 60);
  const queryAnchoredLocal = anchorLocalLawsFromQueries(analysis.searchQueries);
  const relaxedLocal = analysis.laws.filter((law) => law.score >= 18);

  if (!liveLaws.length && !localHighConfidence.length && !queryAnchoredLocal.length && !relaxedLocal.length) {
    return analysis;
  }

  const laws = ensureDisplayLawsFromSources({
    prioritized: prioritizeDisplayLaws(
      mergeLaws(liveLaws, [...localHighConfidence, ...queryAnchoredLocal, ...relaxedLocal]),
      analysis.searchQueries,
    ),
    liveLaws,
    searchQueries: analysis.searchQueries,
    maxCount: 12,
  });
  const conflicts = detectConflicts(laws, analysis.conditions, mode);
  const checklist = buildChecklist(laws, conflicts, analysis.conditions);
  const heatmap = buildHeatmap(laws, analysis.conditions);
  const risk = calculateRisk(laws, conflicts, analysis.conditions);

  return {
    ...analysis,
    laws,
    conflicts,
    checklist,
    heatmap,
    risk,
    graph: buildGraph(laws, checklist, conflicts, analysis.conditions),
  };
}

function extractConditions(query, selectedSector, selectedRegion, mode) {
  const text = normalize(query);
  const inferredSector = inferByKeywords(text, sectorKeywords, "general");
  const inferredRegion = inferByKeywords(text, regionKeywords, "nationwide");
  const topics = Object.entries(topicKeywords)
    .filter(([, words]) => words.some((word) => text.includes(normalize(word))))
    .map(([topic]) => topic);

  if (!topics.length) topics.push(...inferFallbackTopics(text));

  const tokens = extractTokens(query);
  const explicitLawQueries = extractExplicitLawQueries(query);

  return {
    sector: selectedSector === "auto" ? inferredSector : selectedSector,
    region: selectedRegion === "auto" ? inferredRegion : selectedRegion,
    topics,
    tokens,
    explicitLawQueries,
    wantsConflict: mode === "conflict" || text.includes("충돌") || text.includes("중복") || text.includes("상충"),
    wantsChecklist: mode === "checklist" || text.includes("체크") || text.includes("대응"),
  };
}

function inferFallbackTopics(text) {
  if (/(다치|다쳤|부상|재해|근무|사업체|5인|작업중|작업 중|사고|보호구|산재)/u.test(text)) {
    return ["safety", "labor"];
  }
  if (/(알바|아르바이트|월급|시급|해고|퇴사|연차|야근|주휴|임금|급여)/u.test(text)) {
    return ["labor", "wages"];
  }
  if (/(인허가|허가|신고|등록|창업|개업|영업신고|설립|오픈)/u.test(text)) {
    return ["permit", "food"];
  }
  if (/(계약|계약서|해지|위약|손해배상)/u.test(text)) {
    return ["contract"];
  }
  if (/(개인정보|전화번호|연락처|탈퇴|홍보|카톡)/u.test(text)) {
    return ["privacy"];
  }
  if (/(환불|쇼핑|판매|구독|배달)/u.test(text)) {
    return ["commerce", "consumer"];
  }
  return ["permit"];
}

function inferByKeywords(text, keywordMap, fallback) {
  let best = { key: fallback, score: 0 };
  Object.entries(keywordMap).forEach(([key, words]) => {
    const score = words.reduce((sum, word) => sum + (text.includes(normalize(word)) ? 1 : 0), 0);
    if (score > best.score) best = { key, score };
  });
  return best.key;
}

function rankLaws(query, conditions, mode, minScore = 36) {
  const text = normalize(query);
  const explicit = conditions.explicitLawQueries.map(normalize);
  const ranked = lawData
    .map((law) => {
      let score = 0;
      const normalizedTitle = normalize(law.title);

      if (conditions.sector !== "general" && law.sectors.includes(conditions.sector)) score += 22;
      if (law.sectors.includes("general")) score += 5;
      if (law.regions.includes(conditions.region)) score += 8;
      if (explicit.some((name) => normalizedTitle.includes(name) || name.includes(normalizedTitle))) score += 45;

      conditions.topics.forEach((topic) => {
        if (law.topics.includes(topic)) score += broadProcessTopics.has(topic) ? 6 : 15;
      });

      law.keywords.forEach((keyword) => {
        if (text.includes(normalize(keyword))) score += 12;
      });

      conditions.tokens.forEach((token) => {
        if (normalizedTitle.includes(token) || normalize(law.summary).includes(token) || normalize(law.evidence).includes(token)) score += 4;
      });

      if (mode === "conflict" && law.relations.some((relation) => relation.type === "tension")) score += 8;
      if (mode === "checklist") score += law.tasks.length;

      return { ...law, score };
    })
    .sort((a, b) => b.score - a.score);

  const matched = ranked.filter((law) => law.score >= minScore);
  return matched;
}

function detectConflicts(laws, conditions, mode) {
  const conflicts = [];

  const add = (requiredTitles, conflict) => {
    if (requiredTitles.every((title) => laws.some((law) => lawTitlesMatch(law.title, title)))) conflicts.push(conflict);
  };

  add(["근로기준법", "최저임금법"], {
    level: "high",
    title: "근로시간 변경 vs 임금·가산수당 산정",
    detail: "근로시간 제도 변경 후 기본급과 고정수당이 최저임금 및 연장·야간·휴일 가산수당 기준을 충족하는지 재산정해야 합니다.",
    laws: ["근로기준법", "최저임금법"],
  });

  add(["개인정보 보호법", "전자상거래 등에서의 소비자보호에 관한 법률"], {
    level: "medium",
    title: "온라인 판매 고지 vs 개인정보 처리방침",
    detail: "주문·배송·환불 과정에서 수집하는 개인정보 항목과 처리방침, 통신판매 고지사항의 표현이 일치해야 합니다.",
    laws: ["개인정보 보호법", "전자상거래법"],
  });

  add(["주택임대차보호법", "민법"], {
    level: "medium",
    title: "임대차 특례 규정 vs 일반 계약 규정",
    detail: "계약갱신, 보증금 증액, 해지 사유는 임대차 특별법과 민법상 계약 규정을 함께 확인해야 합니다.",
    laws: ["주택임대차보호법", "민법"],
  });

  add(["대기환경보전법", "폐기물관리법"], {
    level: "medium",
    title: "배출시설 인허가 vs 폐기물 처리 위탁",
    detail: "공장 증설은 대기배출시설 허가·신고와 폐기물 보관·위탁 처리 기록 의무가 동시에 발생할 수 있습니다.",
    laws: ["대기환경보전법", "폐기물관리법"],
  });

  add(["식품위생법", "상가건물 임대차보호법"], {
    level: "low",
    title: "영업신고 시설기준 vs 상가 임대차 조건",
    detail: "카페·음식점 창업은 영업장 시설기준과 임대차 용도·권리관계를 함께 점검해야 합니다.",
    laws: ["식품위생법", "상가건물 임대차보호법"],
  });

  add(["도로교통법", "학원의 설립ㆍ운영 및 과외교습에 관한 법률"], {
    level: "medium",
    title: "학원 운영 기준 vs 통학차량 안전 의무",
    detail: "학원 등록·운영 기준과 통학버스 신고, 동승자, 안전교육 의무를 별도로 확인해야 합니다.",
    laws: ["도로교통법", "학원법"],
  });

  if (!conflicts.length && (conditions.wantsConflict || mode === "conflict")) {
    conflicts.push({
      level: "low",
      title: "명시적 충돌 후보 없음",
      detail: "현재 입력에서는 직접 충돌보다 적용 범위, 신고·고지, 기록 보존 누락 여부를 우선 점검하세요.",
      laws: laws.slice(0, 2).map((law) => law.title),
    });
  }

  return conflicts;
}

function buildChecklist(laws, conflicts, conditions) {
  const taskMap = new Map();

  laws.forEach((law) => {
    law.tasks.forEach((task) => {
      if (!taskMap.has(task)) {
        taskMap.set(task, {
          title: task,
          evidence: `${law.title} ${law.article}`,
          due: getDueLabel(law),
        });
      }
    });
  });

  if (conflicts.some((conflict) => conflict.level === "high")) {
    taskMap.set("고위험 충돌 후보 전문가 검토 의뢰", {
      title: "고위험 충돌 후보 전문가 검토 의뢰",
      evidence: "충돌 가능성 탐지 결과",
      due: "전문가",
    });
  }

  if (conditions.topics.includes("amendment")) {
    taskMap.set("개정 전·후 운영규정 비교표 작성", {
      title: "개정 전·후 운영규정 비교표 작성",
      evidence: "개정 대응 조건",
      due: "변경",
    });
  }

  if (conditions.topics.includes("permit") || conditions.topics.includes("reporting")) {
    taskMap.set("관할 기관 신고·허가 제출자료 확인", {
      title: "관할 기관 신고·허가 제출자료 확인",
      evidence: "인허가·신고 조건",
      due: "제출",
    });
  }

  if (conditions.region !== "nationwide") {
    taskMap.set(`${regionLabels[conditions.region]} 자치법규·관할 기준 확인`, {
      title: `${regionLabels[conditions.region]} 자치법규·관할 기준 확인`,
      evidence: "지역 조건",
      due: "지역",
    });
  }

  return [...taskMap.values()].slice(0, 8);
}

function getDueLabel(law) {
  if (law.topics.includes("reporting") || law.topics.includes("permit")) return "제출";
  if (law.topics.includes("safety") || law.topics.includes("privacy") || law.topics.includes("hours") || law.topics.includes("wages")) return "우선";
  if (law.topics.includes("tax") || law.topics.includes("records")) return "후속";
  return "확인";
}

function buildHeatmap(laws, conditions) {
  const rows = ["인허가·신고", "계약·고지", "기록·보존", "안전·점검"];
  const cols = ["서울", "경기", "부산", "전국"];
  const topicMap = {
    "인허가·신고": ["permit", "reporting", "local", "tax", "fire"],
    "계약·고지": ["contract", "notice", "consumer", "commerce", "lease"],
    "기록·보존": ["privacy", "records", "outsourcing", "wages", "healthcare"],
    "안전·점검": ["safety", "food", "environment", "traffic", "education", "construction", "fire", "healthcare"],
  };

  return rows.map((row) => {
    const topics = topicMap[row];
    return {
      row,
      cells: cols.map((col) => {
        const regionKey = Object.entries(regionLabels).find(([, label]) => label === col)?.[0] || "nationwide";
        const regionBoost = conditions.region === regionKey ? 1 : 0;
        const matchedLaws = laws.filter((law) => {
          const topicMatch = topics.some((topic) => law.topics.includes(topic));
          const regionMatch = law.regions.includes(regionKey) || law.regions.includes("nationwide");
          return topicMatch && regionMatch;
        });
        const topicScore = matchedLaws.length;
        const score = topicScore + regionBoost;
        const level = score >= 4 ? "high" : score >= 2 ? "mid" : score >= 1 ? "low" : "none";
        return {
          col,
          score,
          level,
          lawCount: matchedLaws.length,
          sampleLaws: matchedLaws.slice(0, 2).map((law) => law.title),
        };
      }),
    };
  });
}

function calculateRisk(laws, conflicts, conditions) {
  const conflictWeight = conflicts.reduce((sum, conflict) => {
    if (conflict.level === "high") return sum + 22;
    if (conflict.level === "medium") return sum + 12;
    return sum + 5;
  }, 0);
  const topicWeight = Math.min(28, conditions.topics.length * 4);
  const lawWeight = Math.min(36, laws.reduce((sum, law) => sum + Math.min(law.score, 60), 0) / 12);
  const score = Math.min(100, Math.round(16 + conflictWeight + topicWeight + lawWeight));

  return {
    score,
    label: score >= 75 ? "높음" : score >= 50 ? "주의" : "보통",
    priority:
      score >= 75
        ? "관련 법령 근거와 신고·계약·고지 의무부터 즉시 검토"
        : score >= 50
          ? "적용 법령 범위와 관할 기관 기준을 우선 대조"
          : "기본 체크리스트와 법제처 검색 결과 중심으로 검토",
  };
}

function buildSearchQueries(query, conditions, laws) {
  const highConfidenceLawNames = laws
    .filter((law) => law.score >= 60 || conditions.explicitLawQueries.some((value) => normalize(law.title).includes(normalize(value))))
    .map((law) => law.title);
  const primaryValues = [
    ...conditions.explicitLawQueries,
    ...filterExpandedQueries(expandSearchQueries(query), conditions),
    ...highConfidenceLawNames.slice(0, 3),
    ...getTopicFallbackQueries(conditions),
  ];
  const queries = canonicalizeSearchQueries(
    filterIrrelevantQueries(
      primaryValues
        .map(cleanSearchQuery)
        .flatMap(expandLawAliasQueries)
        .filter((value) => isUsableLawQuery(value) && isLawLikeSearchQuery(value)),
      conditions,
    ),
  ).slice(0, 8);

  if (queries.length) return queries;
  return canonicalizeSearchQueries(getTopicFallbackQueries(conditions))
    .filter((value) => isLawLikeSearchQuery(value) && !isGarbageLawQuery(value))
    .slice(0, 4);
}

function filterIrrelevantQueries(values, conditions) {
  const isAcademyTransport =
    conditions.topics.includes("education") && conditions.topics.includes("traffic");
  if (isAcademyTransport) {
    return values.filter((value) => {
      const compact = normalize(String(value || ""));
      return (
        compact.includes(normalize("학원의설립")) ||
        compact.includes(normalize("도로교통법")) ||
        compact.includes(normalize("학원")) ||
        compact.includes(normalize("도로교통"))
      );
    });
  }

  if (
    (conditions.topics.includes("healthcare") || conditions.sector === "healthcare") &&
    (conditions.topics.includes("fire") || conditions.sector === "fire")
  ) {
    return values.filter((value) => /(의료|응급|소방|화재|스프링클러|소방시설)/u.test(String(value || "")));
  }

  if (conditions.topics.includes("healthcare") || conditions.sector === "healthcare") {
    return values.filter((value) => /(의료|응급|개인정보)/u.test(String(value || "")));
  }

  if (conditions.topics.includes("fire") || conditions.sector === "fire") {
    return values.filter((value) => /(소방|화재|스프링클러|소방시설|예방)/u.test(String(value || "")));
  }

  return values;
}

function getTopicFallbackQueries(conditions) {
  const skipTopics = new Set();
  if (conditions.topics.includes("education") || conditions.sector === "education") {
    skipTopics.add("commerce");
    skipTopics.add("consumer");
  }
  if (conditions.topics.includes("education") && conditions.topics.includes("traffic")) {
    skipTopics.add("commerce");
    skipTopics.add("consumer");
    skipTopics.add("contract");
  }
  if (conditions.topics.includes("healthcare") || conditions.sector === "healthcare") {
    skipTopics.add("commerce");
    skipTopics.add("consumer");
  }
  if (conditions.topics.includes("fire") && conditions.topics.includes("healthcare")) {
    skipTopics.add("commerce");
    skipTopics.add("consumer");
  }
  if (conditions.topics.includes("fire") || conditions.sector === "fire") {
    skipTopics.add("permit");
  }
  if (conditions.topics.includes("safety") || conditions.topics.includes("labor") || conditions.sector === "workplace") {
    skipTopics.add("permit");
  }
  if (conditions.topics.includes("traffic") || conditions.topics.includes("education")) {
    skipTopics.add("commerce");
  }

  const prioritized = conditions.topics.filter((topic) => !broadProcessTopics.has(topic) || conditions.topics.length <= 2);
  let topicList = prioritized.length ? prioritized : conditions.topics;
  if (conditions.topics.includes("education") && conditions.topics.includes("traffic")) {
    topicList = ["education", "traffic", ...topicList.filter((topic) => topic !== "education" && topic !== "traffic")];
  }

  return topicList
    .filter((topic) => !skipTopics.has(topic))
    .map((topic) => topicSearchFallback[topic])
    .filter(Boolean);
}

function buildGraph(laws, checklist, conflicts, conditions) {
  const agencies = [...new Set(laws.map((law) => law.agency))].slice(0, 3);
  const nodes = [
    { id: "query", label: "입력 상황", group: "query" },
    ...laws.slice(0, 5).map((law) => ({ id: law.id, label: law.title, group: "law" })),
    ...checklist.slice(0, 4).map((task, index) => ({ id: `task-${index}`, label: task.title, group: "task" })),
    ...agencies.map((agency, index) => ({ id: `agency-${index}`, label: agency, group: "agency" })),
    { id: "region", label: regionLabels[conditions.region], group: "region" },
  ];

  const lawIds = new Set(laws.slice(0, 5).map((law) => law.id));
  const edges = [];
  laws.slice(0, 5).forEach((law) => {
    edges.push({ from: "query", to: law.id, type: "impact" });
    const agencyIndex = agencies.indexOf(law.agency);
    if (agencyIndex >= 0) edges.push({ from: law.id, to: `agency-${agencyIndex}`, type: "default" });
    if (law.regions.includes(conditions.region)) edges.push({ from: law.id, to: "region", type: "impact" });
  });

  checklist.slice(0, 4).forEach((task, index) => {
    const law = laws.find((item) => task.evidence.includes(item.title));
    edges.push({ from: law?.id || "query", to: `task-${index}`, type: "impact" });
  });

  conflicts.forEach((conflict) => {
    const conflictLaws = laws.filter((law) => conflict.laws.some((name) => law.title.includes(name) || name.includes(law.title)));
    if (conflictLaws.length >= 2 && lawIds.has(conflictLaws[0].id) && lawIds.has(conflictLaws[1].id)) {
      edges.push({ from: conflictLaws[0].id, to: conflictLaws[1].id, type: "conflict" });
    }
  });

  return { nodes, edges };
}

function buildLiveLaws(items, conditions, searchQueries = []) {
  return items
    .filter((item) => item?.title)
    .map((item, index) => {
      const title = item.title || "법령명 없음";
      const localMatch = lawData.find((law) => normalize(law.title) === normalize(title));
      const inferredTopics = inferTopics(`${title} ${item.matchedQuery || ""}`);
      const topics = unique([...(localMatch?.topics || []), ...(conditions.topics || []), ...inferredTopics]);
      const idBase = item.id || title;
      const matchScore = scoreLawTitleForQuery(title, item.matchedQuery || title);
      const queryBoost = Math.max(...(searchQueries || []).map((query) => scoreLawTitleForQuery(title, query)), 0);

      return {
        id: `lawapi-${index}-${slugify(idBase)}`,
        title,
        type: "법제처",
        article: localMatch?.article || (item.enforcementDate ? `시행 ${formatDate(item.enforcementDate)}` : "전체 법령 검색 결과"),
        summary: localMatch?.summary || `${item.matchedQuery || title} 검색으로 확인된 법제처 법령`,
        evidence: localMatch?.evidence || `법제처 전체 법령 검색에서 "${item.matchedQuery || title}" 검색어로 확인된 법령입니다. 적용 조문, 별표, 부칙은 원문에서 확인하세요.`,
        agency: item.agency || "소관부처 미확인",
        sectors: unique([...(localMatch?.sectors || []), conditions.sector, "general"]).filter(Boolean),
        regions: ["nationwide", "seoul", "gyeonggi", "busan"],
        topics: topics.length ? topics : ["permit"],
        keywords: unique([title, item.matchedQuery].filter(Boolean)),
        tasks: localMatch?.tasks || [`${title} 원문 조문 확인`, `${title} 시행일·개정이력 확인`],
        relations: localMatch?.relations || [],
        score: Math.max(55, matchScore + queryBoost - index * 2 - decreePenalty(title)),
        source: "lawApi",
        matchedQuery: item.matchedQuery,
        detailPath: item.detailPath,
        promulgationDate: item.promulgationDate,
        enforcementDate: item.enforcementDate,
      };
    });
}

function prioritizeDisplayLaws(laws, searchQueries = []) {
  const queries = canonicalizeSearchQueries(searchQueries);
  const apiLaws = [...laws].filter((law) => law.source === "lawApi").sort((left, right) => (right.score || 0) - (left.score || 0));
  const otherLaws = laws.filter((law) => law.source !== "lawApi");
  const picked = [];
  const seen = new Set(apiLaws.map((law) => normalize(law.title)));

  queries.forEach((query) => {
    const match = [...otherLaws, ...apiLaws]
      .filter((law) => !seen.has(normalize(law.title)))
      .sort((left, right) => displaySortScore(right, query) - displaySortScore(left, query))[0];
    const minScore = match?.source === "lawApi" ? 35 : 45;
    if (match && scoreLawTitleForQuery(match.title, query) >= minScore) {
      picked.push(match);
      seen.add(normalize(match.title));
    }
  });

  const remainder = [...otherLaws, ...apiLaws]
    .filter((law) => !seen.has(normalize(law.title)))
    .sort((left, right) => (right.score || 0) - (left.score || 0));

  const decreeCount = new Map();
  const titleSeen = new Set();
  return [...apiLaws, ...picked, ...remainder].filter((law) => {
    const titleKey = normalize(law.title);
    if (titleSeen.has(titleKey)) return false;
    titleSeen.add(titleKey);

    const base = baseLawName(law.title);
    if (!/시행령|시행규칙/u.test(law.title)) return true;
    const count = decreeCount.get(base) || 0;
    if (count >= 1) return false;
    decreeCount.set(base, count + 1);
    return true;
  });
}

function displaySortScore(law, query) {
  return (law.score || 0) + scoreLawTitleForQuery(law.title, query);
}

function decreePenalty(title) {
  return /시행령|시행규칙/u.test(String(title || "")) ? 12 : 0;
}

function baseLawName(title) {
  return normalize(String(title || "").replace(/시행령.*$/u, "").replace(/시행규칙.*$/u, ""));
}

function anchorLocalLawsFromQueries(searchQueries = []) {
  return canonicalizeSearchQueries(searchQueries)
    .map((query) => lawData.find((law) => lawTitlesMatch(law.title, query)))
    .filter(Boolean)
    .map((law) => ({ ...law, score: Math.max(law.score || 0, 88), source: "local" }));
}

function mergeLaws(primary, secondary) {
  const merged = [];
  const seen = new Set();

  [...primary, ...secondary].forEach((law) => {
    const key = normalize(law.title);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(law);
  });

  return merged;
}

function expandSearchQueries(query) {
  const text = normalize(query);
  const expanded = [];

  queryExpansionRules.forEach((rule) => {
    if (rule.terms.some((term) => text.includes(normalize(term)))) {
      expanded.push(...rule.queries);
    }
  });

  return expanded;
}

function filterExpandedQueries(expanded, conditions) {
  const isEducation =
    conditions.sector === "education" || (conditions.topics.includes("education") && conditions.topics.includes("traffic"));
  if (!isEducation) return expanded;

  return expanded.filter((query) => !/(전자상거래|소비자기본|약관의 규제|표시)/u.test(String(query || "")));
}

function inferTopics(value) {
  const text = normalize(value);
  return Object.entries(topicKeywords)
    .filter(([, words]) => words.some((word) => text.includes(normalize(word))))
    .map(([topic]) => topic);
}

function extractExplicitLawQueries(query) {
  const matches = query.match(/[가-힣A-Za-z0-9ㆍ·\s]{2,30}(?:법률|보호법|관리법|기본법|특별법|보장법|보전법|교통법|건축법|민법|상법|형법|법|령|규칙|조례|고시)/g) || [];
  return unique(
    matches
      .map(cleanSearchQuery)
      .map(trimToLawName)
      .map(canonicalizeLawQuery)
      .flatMap(expandLawAliasQueries)
      .filter((value) => value.length >= 2 && value.length <= 40)
      .filter((value) => !isSentenceLikeLawQuery(value))
      .filter(isUsableLawQuery),
  ).slice(0, 4);
}

function extractSearchTerms(query) {
  return extractTokens(query)
    .map(stripKoreanParticle)
    .filter((token) => token.length >= 3)
    .filter((token) => !stopTokens.has(token))
    .slice(0, 3);
}

function extractTokens(query) {
  return unique(
    String(query)
      .toLowerCase()
      .split(/[^가-힣a-z0-9]+/i)
      .map((token) => stripKoreanParticle(token.trim()))
      .filter((token) => token.length >= 2)
      .filter((token) => !stopTokens.has(token)),
  );
}

function stripKoreanParticle(token) {
  return String(token).replace(/(으로|에게|에서|부터|까지|마다|처럼|보다|하고|이며|이고|에는|을|를|이|가|은|는|의|와|과|에)$/u, "");
}

function cleanSearchQuery(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/^[,.\s]+|[,.\s]+$/g, "")
    .replace(/^(그리고|또는|관련|대한)\s+/g, "")
    .trim();
}

function trimToLawName(value) {
  const text = String(value).trim();
  const knownLawStart = text.search(/[가-힣A-Za-z0-9ㆍ·]+(?:법률|보호법|관리법|기본법|특별법|보장법|보전법|교통법|건축법|민법|법|령|규칙|조례|고시)$/);
  if (knownLawStart > 0) return text.slice(knownLawStart).trim();
  if (/(규정)$/.test(text) && !/(법|령|규칙|조례|고시)/.test(text)) return "";
  return text;
}

function ensureDisplayLawsFromSources({ prioritized, liveLaws, searchQueries, maxCount }) {
  const seen = new Set();
  const merged = [];

  const push = (law) => {
    const key = normalize(law?.title);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(law);
  };

  prioritized.forEach(push);

  canonicalizeSearchQueries(searchQueries).forEach((query) => {
    if (merged.some((law) => lawTitlesMatch(law.title, query))) return;
    const bestLive = [...liveLaws]
      .filter((law) => scoreLawTitleForQuery(law.title, query) >= 35)
      .sort((left, right) => scoreLawTitleForQuery(right.title, query) - scoreLawTitleForQuery(left.title, query))[0];
    if (bestLive) push(bestLive);
  });

  liveLaws.forEach((law) => {
    if (merged.length >= maxCount) return;
    push(law);
  });

  return merged.slice(0, maxCount);
}

function isUsableLawQuery(value) {
  const text = cleanSearchQuery(canonicalizeLawQuery(value));
  const normalized = normalize(text);
  if (!text || ["법령", "관련법령"].includes(normalized)) return false;
  if (isGarbageLawQuery(text)) return false;
  if (isSentenceLikeLawQuery(text)) return false;
  if (["어떤법", "무슨법", "어느법", "무슨법률", "어떤법률"].some((phrase) => normalized.includes(phrase))) return false;
  if (["법을봐야", "법이뭐", "법을찾", "법알려", "법궁금"].some((phrase) => normalized.includes(phrase))) return false;
  if (ignoredStandaloneLawQueries.has(normalized)) return false;
  return true;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalize(value) {
  return String(value).toLowerCase().replace(/\s+/g, "");
}

function slugify(value) {
  return normalize(value).replace(/[^a-z0-9가-힣]+/gi, "-").slice(0, 48) || "law";
}

function formatDate(value) {
  const text = String(value || "");
  if (/^\d{8}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  return text || "미확인";
}
