export function buildPlainLanguageSummary(analysis) {
  if (!analysis) return null;
  const sector = analysis.labels?.sector || "해당";
  const region = analysis.labels?.region || "전국";
  const risk = analysis.risk?.priority || "";

  const topLaws = (analysis.laws || []).slice(0, 2);
  const because = [
    `입력 내용에서 핵심 키워드를 추출해 ${sector} 관련 법령 후보를 먼저 올렸어요.`,
    ...topLaws.map((law) => `관련 법령 후보: ${law.title}${law.article ? `(${law.article})` : ""}`),
  ].slice(0, 3);

  const topTasks = (analysis.checklist || []).slice(0, 3).map((t) => taskTitleToQuestion(t.title));
  const actions = [
    risk ? `우선순위: ${risk}` : `우선순위: ${sector} · ${region} 기준으로 먼저 확인`,
    topTasks.length ? `체크리스트 상위 ${topTasks.length}개부터 확인: ${topTasks.join(" / ")}` : "체크리스트가 비어 있어 법령 목록부터 확인",
    "확실하지 않으면 「원문 보기」로 법제처에서 조항 적용 범위를 확인",
  ];

  return {
    conclusion: `${sector} · ${region} 기준으로 지금 당장 확인할 항목을 정리했어요.`,
    because,
    actions,
  };
}

export function taskTitleToQuestion(title) {
  const text = String(title || "").trim();
  if (!text) return "이 항목이 우리 상황에 해당하나요?";
  if (/(대상|해당)/u.test(text)) return `${text.replace(/확인$/u, "").trim()}인가요?`;
  if (/의무/u.test(text)) return `${text.replace(/확인$/u, "").trim()}가 있나요?`;
  if (/(점검|보고|제출|신고)/u.test(text)) return `${text.replace(/확인$/u, "").trim()}가 필요한가요?`;
  if (/(작성|정리|갱신|비교표)/u.test(text)) return `${text.replace(/확인$/u, "").trim()}가 필요하나요?`;
  return `${text.replace(/확인$/u, "").trim()}을(를) 확인해야 하나요?`;
}

export function taskTitleToNeededInfo(title) {
  const text = String(title || "");
  if (/(소방|스프링클러|비상구|피난)/u.test(text)) {
    return ["건물 용도(다중이용시설 여부)", "연면적/층수", "소방시설 설치 현황", "최근 점검·자체점검 기록"];
  }
  if (/(개인정보|처리방침|동의|CCTV|기록)/u.test(text)) {
    return ["수집 항목(이름/연락처 등)", "수집 목적·보유기간", "제3자 제공/위탁 여부", "파기/접근권한 관리 방식"];
  }
  if (/(임금|근로시간|수당|최저임금)/u.test(text)) {
    return ["근로계약/취업규칙", "근무표(연장·야간·휴일)", "급여명세서/임금 항목", "근로자대표 합의 여부"];
  }
  if (/(허가|신고|제출|등록|인허가)/u.test(text)) {
    return ["사업장/시설 주소", "업종·영업 형태", "관할 기관", "필요 서류/제출 기한"];
  }
  return [];
}
