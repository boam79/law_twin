import {
  canonicalizeLawQuery,
  canonicalizeSearchQueries,
  ignoredStandaloneLawQueries,
  isGarbageLawQuery,
  isLawLikeSearchQuery,
  isSentenceLikeLawQuery,
  normalizeCompact,
} from "./lawSearchTerms.js";

export const topicSearchFallback = {
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

const broadProcessTopics = new Set([
  "permit",
  "reporting",
  "records",
  "notice",
  "amendment",
  "local",
  "contract",
  "outsourcing",
]);

function normalizeTopicText(value) {
  return String(value).toLowerCase().replace(/\s+/g, "");
}

export function inferFallbackTopics(text) {
  const normalized = normalizeTopicText(text);
  if (/(다치|다쳤|부상|재해|근무|사업체|5인|작업중|작업 중|사고|보호구|산재)/u.test(normalized)) {
    return ["safety", "labor"];
  }
  if (/(알바|아르바이트|월급|시급|해고|퇴사|연차|야근|주휴|임금|급여)/u.test(normalized)) {
    return ["labor", "wages"];
  }
  if (/(인허가|허가|신고|등록|창업|개업|영업신고|설립|오픈)/u.test(normalized)) {
    return ["permit", "food"];
  }
  if (/(계약|계약서|해지|위약|손해배상)/u.test(normalized)) {
    return ["contract"];
  }
  if (/(개인정보|전화번호|연락처|탈퇴|홍보|카톡)/u.test(normalized)) {
    return ["privacy"];
  }
  if (/(환불|쇼핑|판매|구독|배달)/u.test(normalized)) {
    return ["commerce", "consumer"];
  }
  return ["permit"];
}

export function filterIrrelevantQueries(values, conditions) {
  const isAcademyTransport =
    conditions.topics.includes("education") && conditions.topics.includes("traffic");
  if (isAcademyTransport) {
    return values.filter((value) => {
      const compact = normalizeCompact(String(value || ""));
      return (
        compact.includes(normalizeCompact("학원의설립")) ||
        compact.includes(normalizeCompact("도로교통법")) ||
        compact.includes(normalizeCompact("학원")) ||
        compact.includes(normalizeCompact("도로교통"))
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

export function getTopicFallbackQueries(conditions) {
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

export function buildEmergencySearchQueries(conditions, searchQueries = [], scenario = "") {
  const seen = new Set(canonicalizeSearchQueries(searchQueries).map((query) => normalizeTopicText(query)));
  const emergency = [];

  const add = (value) => {
    const query = canonicalizeLawQuery(String(value || "").trim());
    if (!query || !isLawLikeSearchQuery(query) || isGarbageLawQuery(query) || isSentenceLikeLawQuery(query)) return;
    if (ignoredStandaloneLawQueries.has(normalizeTopicText(query))) return;
    const key = normalizeTopicText(query);
    if (seen.has(key)) return;
    seen.add(key);
    emergency.push(query);
  };

  getTopicFallbackQueries(conditions).forEach(add);

  const text = normalizeTopicText(scenario);
  if (/(계약|계약서|해지|위약)/u.test(text)) add("민법");
  if (/(개인정보|전화번호|연락처|탈퇴|홍보)/u.test(text)) add("개인정보 보호법");
  if (/(환불|쇼핑|판매|구독)/u.test(text)) add("전자상거래 등에서의 소비자보호에 관한 법률");

  return emergency.slice(0, 6);
}
