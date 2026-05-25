import { lawTitlesMatch } from "./lawSearchTerms.js";

const HEATMAP_ROW_HINTS = {
  "인허가·신고": "허가·신고·등록 의무가 걸릴 수 있는 업무",
  "계약·고지": "계약서·고지·약관·소비자 안내",
  "기록·보존": "기록 작성·보관·파기·개인정보",
  "안전·점검": "안전·소방·위생·환경·교통·시설 점검",
};

export function buildDataQuality(analysis) {
  if (!analysis) return null;

  const laws = analysis.laws || [];
  const lawApiItems = analysis.lawApi?.items || [];
  const fromLawApi = laws.filter((law) => law.source === "lawApi").length;
  const searchQueries = analysis.searchQueries || [];
  const alignedQueries = searchQueries.filter((query) =>
    laws.some((law) => lawTitlesMatch(law.title, query) || law.matchedQuery === query),
  );

  return {
    laws: {
      source: fromLawApi > 0 ? "lawApi+rules" : "rules",
      label: fromLawApi > 0 ? "법제처 검색 + 내부 규칙" : "내부 규칙 엔진(검증용 참고)",
      count: laws.length,
      lawApiVerified: fromLawApi,
      lawApiTotal: lawApiItems.length,
    },
    checklist: {
      source: "derived",
      label: "관련 법령별 실무 확인 항목(자동 생성)",
      description:
        "변호사·공무원 대신 결론을 내리지 않습니다. 각 법령에 묶인 ‘확인할 일’을 체크하면서 법제처 원문으로 근거를 대조하는 용도입니다.",
      count: analysis.checklist?.length ?? 0,
    },
    conflicts: {
      source: "rules",
      label: "자주 겹치는 법령 조합 규칙(후보)",
      count: analysis.conflicts?.length ?? 0,
    },
    heatmap: {
      source: "heuristic",
      label: "지역·업무 검토 우선순위(공식 통계·조례 데이터 아님)",
      grid: "4개 업무 × 4개 지역",
    },
    searchQueries: {
      aligned: alignedQueries.length,
      total: searchQueries.length,
      mismatch: searchQueries.length > 0 && alignedQueries.length < Math.min(2, searchQueries.length),
      note:
        searchQueries.length > 0 && alignedQueries.length < Math.min(2, searchQueries.length)
          ? "법제처 검색어와 화면에 표시된 법령이 다를 수 있습니다. 아래 관련 법령 목록을 기준으로 보세요."
          : null,
    },
    integrations: {
      lawApi: Boolean(analysis.integrations?.lawApi),
      geminiSummary: Boolean(analysis.integrations?.geminiSummary),
    },
  };
}

export function buildNextSteps(analysis, mode) {
  if (!analysis) return [];

  const quality = buildDataQuality(analysis);
  const hasLaws = (analysis.laws?.length ?? 0) > 0;
  const hasChecklist = (analysis.checklist?.length ?? 0) > 0;
  const hasLawApi = quality.integrations.lawApi && quality.laws.lawApiVerified > 0;

  const steps = [
    {
      id: "confirm",
      title: "① 조건이 맞는지 확인",
      detail: "왼쪽 추출 조건(업종·지역·주제)이 상황과 맞으면 다음으로 진행하세요. 다르면 업종/지역을 바꾸고 다시 분석하세요.",
      tab: null,
    },
    {
      id: "relation",
      title: "② 함께 볼 법령 찾기",
      detail: "법령 연관 히트맵에서 색이 진한 칸부터 원문·조항을 대조하세요.",
      tab: "relation",
    },
    {
      id: "detail",
      title: "③ 할 일 목록 실행",
      detail: hasChecklist
        ? "「2. 법령·대응」에서 검토 체크리스트(할 일 목록)를 체크하고, 각 항목의 근거 법령 원문을 확인하세요."
        : "「2. 법령·대응」에서 관련 법령을 먼저 확인하세요.",
      tab: "detail",
    },
    {
      id: "region",
      title: "④ 어디부터 할지 참고",
      detail: `지역·업무 영향은 ${quality.heatmap.label}. 숫자가 큰 칸부터 내부 절차를 배치하세요.`,
      tab: "region",
    },
  ];

  if (!hasLawApi) {
    steps.push({
      id: "lawapi",
      title: "⑤ 법제처 연동 확인",
      detail: "법제처 API 키가 없거나 검색 결과가 없으면 표시 법령은 내부 후보입니다. 배포 환경의 LAW_API_KEY를 확인하세요.",
      tab: "detail",
    });
  }

  if (mode === "conflict") {
    steps[1].detail = "충돌 보기 모드입니다. 붉은 연관·충돌 검토 후보를 먼저 검토하세요.";
  }

  return steps;
}

export function getHeatmapRowHint(row) {
  return HEATMAP_ROW_HINTS[row] || row;
}

export const CHECKLIST_DUE_HINTS = {
  제출: "관할 기관에 제출·신고가 필요할 수 있는 항목",
  우선: "사고·분쟁 예방을 위해 먼저 확인할 항목",
  후속: "기록·세무 등 마감·보존이 있는 항목",
  확인: "내부 규정·계약과 맞는지 보면 되는 항목",
  지역: "지자체 조례·관할이 달라질 수 있는 항목",
  변경: "규정·제도 개정에 따른 정비 항목",
  전문가: "법률·노무 등 전문 검토가 필요할 수 있는 항목",
};
