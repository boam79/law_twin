import { lawData, regionLabels, sectorLabels, topicLabels } from "./lawData";

const topicKeywords = {
  labor: ["노동", "근로", "직원", "사업장", "노무", "인사", "취업규칙", "포괄임금"],
  hours: ["근로시간", "연장근로", "야간", "휴일", "휴게", "교대제", "선택근로", "탄력근로"],
  wages: ["임금", "급여", "수당", "최저임금", "통상임금", "상여금", "퇴직급여", "퇴직금"],
  safety: ["산업안전", "안전보건", "위험성평가", "도급", "협력업체", "제조", "작업장"],
  amendment: ["개정", "변경", "최신", "신설", "개편", "폐지", "도입"],
  local: ["서울", "경기", "부산", "지자체", "조례", "자치법규", "지역"],
  outsourcing: ["도급", "위탁", "수탁", "외주", "협력업체"],
  reporting: ["신고", "보고", "제출", "노동관서"],
  records: ["기록", "보존", "파기", "로그", "명세서", "이력"],
  notice: ["공문", "통지", "처분", "의견제출", "동의", "공지", "절차"],
};

const regionKeywords = {
  seoul: ["서울", "강남", "서초", "송파"],
  gyeonggi: ["경기", "수원", "성남", "용인", "고양"],
  busan: ["부산", "해운대", "동래"],
  nationwide: ["전국", "국가", "중앙"],
};

const sectorKeywords = {
  workplace: ["노동", "근로", "직원", "사업장", "노무", "인사", "임금", "급여", "취업규칙", "산업안전", "포괄임금"],
  public: ["공공기관", "지자체", "행정", "민원", "주민", "공무원"],
  enterprise: ["기업", "회사", "준법", "지점", "사업장", "처리방침"],
};

export function analyzeScenario({ scenario, sector = "auto", region = "auto", mode = "impact" }) {
  const query = String(scenario || "").trim();
  const conditions = extractConditions(query, sector, region, mode);
  const laws = rankLaws(query, conditions, mode).slice(0, 6);
  const conflicts = detectConflicts(laws, conditions, mode);
  const checklist = buildChecklist(laws, conflicts, conditions);
  const heatmap = buildHeatmap(laws, conditions);
  const risk = calculateRisk(laws, conflicts, conditions);

  return {
    query,
    conditions,
    labels: {
      sector: sectorLabels[conditions.sector],
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
  const inferredSector = inferByKeywords(text, sectorKeywords, "workplace");
  const inferredRegion = inferByKeywords(text, regionKeywords, "nationwide");
  const topics = Object.entries(topicKeywords)
    .filter(([, words]) => words.some((word) => text.includes(normalize(word))))
    .map(([topic]) => topic);

  if (!topics.length) topics.push("labor");

  const tokens = Array.from(
    new Set(
      text
        .split(/[^가-힣a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2),
    ),
  );

  return {
    sector: selectedSector === "auto" ? inferredSector : selectedSector,
    region: selectedRegion === "auto" ? inferredRegion : selectedRegion,
    topics,
    tokens,
    wantsConflict: mode === "conflict" || text.includes("충돌") || text.includes("중복"),
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
  const ranked = lawData
    .map((law) => {
      let score = 0;
      if (law.sectors.includes(conditions.sector)) score += 24;
      if (law.regions.includes(conditions.region)) score += 12;

      conditions.topics.forEach((topic) => {
        if (law.topics.includes(topic)) score += 16;
      });

      law.keywords.forEach((keyword) => {
        if (text.includes(normalize(keyword))) score += 12;
      });

      conditions.tokens.forEach((token) => {
        if (normalize(law.title).includes(token) || normalize(law.summary).includes(token)) score += 4;
      });

      if (conditions.sector === "workplace" && law.sectors.includes("workplace")) score += 10;
      if (mode === "conflict" && law.relations.some((relation) => relation.type === "tension")) score += 8;
      if (mode === "checklist") score += law.tasks.length;

      return { ...law, score };
    })
    .sort((a, b) => b.score - a.score);

  const matched = ranked.filter((law) => law.score >= 20);
  return matched.length ? matched : ranked.slice(0, 4);
}

function detectConflicts(laws, conditions, mode) {
  const lawIds = new Set(laws.map((law) => law.id));
  const conflicts = [];

  if (lawIds.has("labor-standards-hours") && lawIds.has("minimum-wage-act")) {
    conflicts.push({
      level: "high",
      title: "포괄임금·근로시간 변경 vs 최저임금·가산수당 산정",
      detail: "근로시간 제도 변경 후 기본급과 고정수당이 최저임금 및 연장·야간·휴일 가산수당 기준을 충족하는지 재산정해야 합니다.",
      laws: ["근로기준법", "최저임금법"],
    });
  }

  if (lawIds.has("labor-standards-hours") && lawIds.has("employment-rules")) {
    conflicts.push({
      level: "medium",
      title: "근무제 개편 vs 취업규칙 불이익 변경 절차",
      detail: "선택근로제, 교대제, 임금체계 변경이 근로자에게 불리하면 의견청취를 넘어 동의 절차가 필요할 수 있습니다.",
      laws: ["근로기준법", "취업규칙"],
    });
  }

  if (lawIds.has("industrial-safety-act") && lawIds.has("employment-rules")) {
    conflicts.push({
      level: "medium",
      title: "작업 방식 변경 vs 안전보건 조치·교육 의무",
      detail: "근무제나 도급 구조 변경은 취업규칙 개정과 별도로 위험성평가, 안전보건 교육, 협력업체 안전조치 갱신이 필요합니다.",
      laws: ["산업안전보건법", "근로기준법"],
    });
  }

  if (!conflicts.length && (conditions.wantsConflict || mode === "conflict")) {
    conflicts.push({
      level: "low",
      title: "명시적 충돌 후보 없음",
      detail: "현재 입력에서는 직접 충돌보다 개정 영향과 절차 누락 리스크가 더 크게 탐지됩니다.",
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
          due: getDueLabel(law, conditions),
        });
      }
    });
  });

  if (conflicts.some((conflict) => conflict.level === "high")) {
    taskMap.set("고위험 충돌 후보 법무·노무 검토 의뢰", {
      title: "고위험 충돌 후보 법무·노무 검토 의뢰",
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

  if (conditions.region !== "nationwide") {
    taskMap.set(`${regionLabels[conditions.region]} 관할 노동관서 신고자료 확인`, {
      title: `${regionLabels[conditions.region]} 관할 노동관서 신고자료 확인`,
      evidence: "지역 조건",
      due: "D+2",
    });
  }

  return [...taskMap.values()].slice(0, 8);
}

function getDueLabel(law) {
  if (law.topics.includes("hours") || law.topics.includes("wages")) return "D+2";
  if (law.topics.includes("safety")) return "D+3";
  if (law.topics.includes("reporting")) return "D+1";
  return "D+5";
}

function buildHeatmap(laws, conditions) {
  const rows = ["근로시간", "임금·수당", "안전보건", "절차·동의"];
  const cols = ["서울", "경기", "부산", "전국"];
  const topicMap = {
    근로시간: ["hours", "labor"],
    "임금·수당": ["wages", "labor"],
    안전보건: ["safety", "outsourcing"],
    "절차·동의": ["notice", "amendment"],
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
  const topicWeight = conditions.topics.length * 4;
  const lawWeight = Math.min(36, laws.reduce((sum, law) => sum + Math.min(law.score, 60), 0) / 12);
  const score = Math.min(100, Math.round(18 + conflictWeight + topicWeight + lawWeight));

  return {
    score,
    label: score >= 75 ? "높음" : score >= 50 ? "주의" : "보통",
    priority:
      score >= 75
        ? "근로시간·임금 산정과 동의 절차부터 즉시 검토"
        : score >= 50
          ? "취업규칙 변경 범위와 수당 산정 기준 우선 대조"
          : "근로계약·급여명세서 체크리스트 중심으로 검토",
  };
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

function normalize(value) {
  return String(value).toLowerCase().replace(/\s+/g, "");
}
