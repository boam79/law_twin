import { lawData, regionLabels, sectorLabels, topicLabels } from "./lawData";

const topicKeywords = {
  labor: ["노동", "근로", "직원", "사업장", "노무", "인사", "취업규칙", "포괄임금", "고용"],
  hours: ["근로시간", "연장근로", "야간", "휴일", "휴게", "교대제", "선택근로", "탄력근로"],
  wages: ["임금", "급여", "수당", "최저임금", "통상임금", "상여금", "퇴직급여", "퇴직금"],
  safety: ["안전", "산업안전", "안전보건", "위험성평가", "보호구역", "통학버스", "시설기준"],
  privacy: ["개인정보", "민감정보", "회원정보", "고객정보", "처리방침", "CCTV", "영상정보"],
  commerce: ["전자상거래", "통신판매", "쇼핑몰", "온라인", "판매", "배달", "사업자등록"],
  consumer: ["소비자", "환불", "교환", "청약철회", "표시광고", "약관"],
  food: ["식품", "위생", "카페", "음식점", "영업신고", "원산지", "주방"],
  lease: ["임대차", "전세", "월세", "보증금", "계약갱신", "확정일자", "전입신고", "권리금"],
  realestate: ["부동산", "상가", "오피스텔", "주택", "중개", "매매", "임대인", "임차인"],
  contract: ["계약", "해지", "손해배상", "위약금", "채권", "채무"],
  construction: ["건축", "리모델링", "증축", "용도변경", "건축허가", "사용승인", "공사"],
  tax: ["세금", "세무", "부가세", "부가가치세", "소득세", "원천징수", "세금계산서", "종합소득세"],
  environment: ["환경", "대기", "폐기물", "배출시설", "오염", "방지시설", "공장", "굴뚝"],
  traffic: ["교통", "도로", "차량", "운전", "통학버스", "보호구역"],
  education: ["학원", "교습소", "과외", "교습비", "강사", "학교", "통학차량", "학원버스"],
  permit: ["인허가", "허가", "신고", "등록", "승인", "영업신고", "설립"],
  amendment: ["개정", "변경", "최신", "신설", "개편", "폐지", "도입", "갱신"],
  local: ["서울", "경기", "부산", "지자체", "조례", "자치법규", "지역", "관할"],
  outsourcing: ["도급", "위탁", "수탁", "외주", "협력업체"],
  reporting: ["신고", "보고", "제출", "관할", "자료"],
  records: ["기록", "보존", "파기", "로그", "명세서", "이력", "증빙"],
  notice: ["공문", "통지", "처분", "의견제출", "동의", "공지", "절차", "고지"],
};

const regionKeywords = {
  seoul: ["서울", "강남", "서초", "송파"],
  gyeonggi: ["경기", "수원", "성남", "용인", "고양"],
  busan: ["부산", "해운대", "동래"],
  nationwide: ["전국", "국가", "중앙"],
};

const sectorKeywords = {
  workplace: ["노동", "근로", "직원", "사업장", "노무", "인사", "임금", "급여", "취업규칙", "산업안전", "포괄임금"],
  enterprise: ["기업", "회사", "준법", "사업자", "쇼핑몰", "통신판매", "계약", "소비자", "세무"],
  public: ["공공기관", "지자체", "행정", "민원", "주민", "공무원", "처분", "공문"],
  privacy: ["개인정보", "처리방침", "CCTV", "회원정보", "고객정보"],
  realestate: ["부동산", "임대차", "전세", "월세", "상가", "오피스텔", "주택", "권리금"],
  tax: ["세금", "세무", "부가세", "소득세", "원천징수", "세금계산서"],
  food: ["식품", "위생", "카페", "음식점", "영업신고", "원산지"],
  construction: ["건축", "리모델링", "증축", "용도변경", "건축허가", "공사"],
  environment: ["환경", "폐기물", "대기", "배출시설", "공장", "오염"],
  traffic: ["교통", "도로", "차량", "통학버스", "운전"],
  education: ["학원", "교습소", "교습비", "강사", "학교", "통학차량", "학원버스"],
};

const topicSearchFallback = {
  labor: "근로기준법",
  hours: "근로기준법",
  wages: "최저임금법",
  safety: "산업안전보건법",
  privacy: "개인정보 보호법",
  commerce: "전자상거래 소비자보호 법률",
  consumer: "소비자기본법",
  food: "식품위생법",
  lease: "주택임대차보호법",
  realestate: "상가건물 임대차보호법",
  contract: "민법",
  construction: "건축법",
  tax: "부가가치세법",
  environment: "대기환경보전법",
  traffic: "도로교통법",
  education: "학원 설립 운영 과외교습 법률",
  permit: "행정절차법",
};

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
  "서울",
  "경기",
  "부산",
  "전국",
]);

export function analyzeScenario({ scenario, sector = "auto", region = "auto", mode = "impact" }) {
  const query = String(scenario || "").trim();
  const conditions = extractConditions(query, sector, region, mode);
  const laws = rankLaws(query, conditions, mode).slice(0, 6);
  const conflicts = detectConflicts(laws, conditions, mode);
  const checklist = buildChecklist(laws, conflicts, conditions);
  const heatmap = buildHeatmap(laws, conditions);
  const risk = calculateRisk(laws, conflicts, conditions);
  const searchQueries = buildSearchQueries(query, conditions, laws);

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

function extractConditions(query, selectedSector, selectedRegion, mode) {
  const text = normalize(query);
  const inferredSector = inferByKeywords(text, sectorKeywords, "general");
  const inferredRegion = inferByKeywords(text, regionKeywords, "nationwide");
  const topics = Object.entries(topicKeywords)
    .filter(([, words]) => words.some((word) => text.includes(normalize(word))))
    .map(([topic]) => topic);

  if (!topics.length) topics.push("permit");

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

function inferByKeywords(text, keywordMap, fallback) {
  let best = { key: fallback, score: 0 };
  Object.entries(keywordMap).forEach(([key, words]) => {
    const score = words.reduce((sum, word) => sum + (text.includes(normalize(word)) ? 1 : 0), 0);
    if (score > best.score) best = { key, score };
  });
  return best.key;
}

function rankLaws(query, conditions, mode) {
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

  const matched = ranked.filter((law) => law.score >= 36);
  return matched.length ? matched : ranked.slice(0, 5);
}

function detectConflicts(laws, conditions, mode) {
  const lawIds = new Set(laws.map((law) => law.id));
  const conflicts = [];

  const add = (requiredIds, conflict) => {
    if (requiredIds.every((id) => lawIds.has(id))) conflicts.push(conflict);
  };

  add(["labor-standards-hours", "minimum-wage-act"], {
    level: "high",
    title: "근로시간 변경 vs 임금·가산수당 산정",
    detail: "근로시간 제도 변경 후 기본급과 고정수당이 최저임금 및 연장·야간·휴일 가산수당 기준을 충족하는지 재산정해야 합니다.",
    laws: ["근로기준법", "최저임금법"],
  });

  add(["privacy-act", "ecommerce-act"], {
    level: "medium",
    title: "온라인 판매 고지 vs 개인정보 처리방침",
    detail: "주문·배송·환불 과정에서 수집하는 개인정보 항목과 처리방침, 통신판매 고지사항의 표현이 일치해야 합니다.",
    laws: ["개인정보 보호법", "전자상거래법"],
  });

  add(["housing-lease-act", "civil-act"], {
    level: "medium",
    title: "임대차 특례 규정 vs 일반 계약 규정",
    detail: "계약갱신, 보증금 증액, 해지 사유는 임대차 특별법과 민법상 계약 규정을 함께 확인해야 합니다.",
    laws: ["주택임대차보호법", "민법"],
  });

  add(["air-environment-act", "waste-control-act"], {
    level: "medium",
    title: "배출시설 인허가 vs 폐기물 처리 위탁",
    detail: "공장 증설은 대기배출시설 허가·신고와 폐기물 보관·위탁 처리 기록 의무가 동시에 발생할 수 있습니다.",
    laws: ["대기환경보전법", "폐기물관리법"],
  });

  add(["food-sanitation-act", "commercial-lease-act"], {
    level: "low",
    title: "영업신고 시설기준 vs 상가 임대차 조건",
    detail: "카페·음식점 창업은 영업장 시설기준과 임대차 용도·권리관계를 함께 점검해야 합니다.",
    laws: ["식품위생법", "상가건물 임대차보호법"],
  });

  add(["road-traffic-act", "private-institute-act"], {
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
      due: "D+3",
    });
  }

  if (conditions.topics.includes("amendment")) {
    taskMap.set("개정 전·후 운영규정 비교표 작성", {
      title: "개정 전·후 운영규정 비교표 작성",
      evidence: "개정 대응 조건",
      due: "D+5",
    });
  }

  if (conditions.topics.includes("permit") || conditions.topics.includes("reporting")) {
    taskMap.set("관할 기관 신고·허가 제출자료 확인", {
      title: "관할 기관 신고·허가 제출자료 확인",
      evidence: "인허가·신고 조건",
      due: "D+2",
    });
  }

  if (conditions.region !== "nationwide") {
    taskMap.set(`${regionLabels[conditions.region]} 자치법규·관할 기준 확인`, {
      title: `${regionLabels[conditions.region]} 자치법규·관할 기준 확인`,
      evidence: "지역 조건",
      due: "D+4",
    });
  }

  return [...taskMap.values()].slice(0, 8);
}

function getDueLabel(law) {
  if (law.topics.includes("reporting") || law.topics.includes("permit")) return "D+2";
  if (law.topics.includes("safety") || law.topics.includes("privacy")) return "D+3";
  if (law.topics.includes("tax") || law.topics.includes("records")) return "D+5";
  return "D+7";
}

function buildHeatmap(laws, conditions) {
  const rows = ["인허가·신고", "계약·고지", "기록·보존", "안전·점검"];
  const cols = ["서울", "경기", "부산", "전국"];
  const topicMap = {
    "인허가·신고": ["permit", "reporting", "local", "tax"],
    "계약·고지": ["contract", "notice", "consumer", "commerce", "lease"],
    "기록·보존": ["privacy", "records", "outsourcing", "wages"],
    "안전·점검": ["safety", "food", "environment", "traffic", "education", "construction"],
  };

  return rows.map((row) => {
    const topics = topicMap[row];
    return {
      row,
      cells: cols.map((col) => {
        const regionKey = Object.entries(regionLabels).find(([, label]) => label === col)?.[0] || "nationwide";
        const regionBoost = conditions.region === regionKey ? 1 : 0;
        const topicScore = laws.reduce((sum, law) => {
          const topicMatch = topics.some((topic) => law.topics.includes(topic));
          const regionMatch = law.regions.includes(regionKey) || law.regions.includes("nationwide");
          return sum + (topicMatch && regionMatch ? 1 : 0);
        }, 0);
        const score = topicScore + regionBoost;
        return {
          col,
          score,
          level: score >= 4 ? "high" : score >= 2 ? "mid" : "low",
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
  const values = [
    ...conditions.explicitLawQueries,
    ...laws.slice(0, 3).map((law) => law.title),
    ...conditions.topics.map((topic) => topicSearchFallback[topic]).filter(Boolean),
    ...extractSearchTerms(query),
  ];
  return unique(values.map(cleanSearchQuery).filter(Boolean)).slice(0, 5);
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

function extractExplicitLawQueries(query) {
  const matches = query.match(/[가-힣A-Za-z0-9ㆍ·\s]{2,45}(?:법률|보호법|관리법|기본법|특별법|보장법|보전법|교통법|건축법|민법|법|령|규칙|조례|고시|규정)/g) || [];
  return unique(
    matches
      .map(cleanSearchQuery)
      .map(trimToLawName)
      .filter((value) => value.length >= 2)
      .filter((value) => !["법령", "관련 법령"].includes(value)),
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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalize(value) {
  return String(value).toLowerCase().replace(/\s+/g, "");
}
