"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChecklistExplainer from "./components/ChecklistExplainer";
import DataQualityBanner from "./components/DataQualityBanner";
import LawRelationHeatmap from "./components/LawRelationHeatmap";
import Panel from "./components/Panel";
import PlainLanguageSummary from "./components/PlainLanguageSummary";
import QuestionChecklistItem from "./components/QuestionChecklistItem";
import RateLimitNotice from "./components/RateLimitNotice";
import RegionImpactHeatmap from "./components/RegionImpactHeatmap";
import ResultTopbar from "./components/ResultTopbar";
import TabIntro from "./components/TabIntro";
import UserActionGuide from "./components/UserActionGuide";
import { sampleScenarios } from "../lib/lawData";
import { buildLawRelationMatrix } from "../lib/lawRelationMatrix.js";
import { buildSafeLawGoKrUrl } from "../lib/security.js";
import { shortLabel } from "../lib/shortLabel.js";

const APP_VERSION = "0.5.10";

const modes = [
  { id: "impact", label: "영향", hint: "어떤 법령이 걸리는지" },
  { id: "conflict", label: "충돌", hint: "규정이 겹치는지" },
  { id: "checklist", label: "대응", hint: "해야 할 일" },
];

const sectors = [
  { id: "auto", label: "자동 판별" },
  { id: "general", label: "전체 법령" },
  { id: "workplace", label: "노동·인사" },
  { id: "enterprise", label: "기업 준법" },
  { id: "public", label: "공공·행정" },
  { id: "privacy", label: "개인정보" },
  { id: "realestate", label: "부동산·임대차" },
  { id: "tax", label: "세무" },
  { id: "food", label: "식품·위생" },
  { id: "construction", label: "건축·인허가" },
  { id: "environment", label: "환경" },
  { id: "traffic", label: "교통·안전" },
  { id: "education", label: "교육" },
  { id: "healthcare", label: "의료" },
  { id: "fire", label: "소방·시설안전" },
];

const regions = [
  { id: "auto", label: "자동 판별" },
  { id: "seoul", label: "서울" },
  { id: "gyeonggi", label: "경기" },
  { id: "busan", label: "부산" },
  { id: "nationwide", label: "전국" },
];

export default function Home() {
  const [scenario, setScenario] = useState("");
  const [sector, setSector] = useState("auto");
  const [region, setRegion] = useState("auto");
  const [mode, setMode] = useState("impact");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("relation");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownTick, setCooldownTick] = useState(0);
  const actionGuideRef = useRef(null);
  const scrollToActionGuideRef = useRef(false);

  const cooldownSecondsLeft = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  }, [cooldownUntil, cooldownTick]);

  useEffect(() => {
    if (!cooldownUntil || cooldownUntil <= Date.now()) return undefined;
    const timer = setInterval(() => {
      if (Date.now() >= cooldownUntil) {
        setCooldownUntil(0);
      }
      setCooldownTick((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => {
    if (!scrollToActionGuideRef.current || !analysis?.nextSteps?.length) return undefined;
    scrollToActionGuideRef.current = false;
    const timer = window.setTimeout(() => {
      const node = actionGuideRef.current;
      if (!node) return;
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      node.scrollIntoView({ behavior, block: "nearest" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [analysis]);

  function applyRateLimitCooldown(payload) {
    const warning = payload?.warnings?.find((item) => item.code === "gemini_rate_limit");
    if (warning?.retryAfterSec) {
      setCooldownUntil(Date.now() + warning.retryAfterSec * 1000);
    }
  }

  async function runAnalysis(next = {}) {
    const nextScenario = String(next.scenario ?? scenario).trim();
    if (!nextScenario) {
      setError("상황 설명을 입력한 뒤 분석 실행을 눌러 주세요.");
      return;
    }

    if (cooldownUntil > Date.now()) {
      setError(`Gemini 요청 한도입니다. 약 ${cooldownSecondsLeft}초 후에 다시 시도해 주세요.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: nextScenario,
          sector: next.sector ?? sector,
          region: next.region ?? region,
          mode: next.mode ?? mode,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `분석 API ${response.status}`);
      }
      const payload = await response.json();
      scrollToActionGuideRef.current = Boolean(payload?.nextSteps?.length);
      setAnalysis(payload);
      applyRateLimitCooldown(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function rotateScenario() {
    const currentIndex = sampleScenarios.indexOf(scenario);
    const nextScenario =
      currentIndex === -1
        ? sampleScenarios[0]
        : sampleScenarios[(currentIndex + 1) % sampleScenarios.length];
    setScenario(nextScenario);
    runAnalysis({ scenario: nextScenario });
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    if (!scenario.trim()) return;
    runAnalysis({ mode: nextMode });
  }

  const checklistText = useMemo(() => {
    if (!analysis) return "";
    return analysis.checklist.map((task, index) => `${index + 1}. [${task.due}] ${task.title} - ${task.evidence}`).join("\n");
  }, [analysis]);

  const lawRelationMatrix = useMemo(() => buildLawRelationMatrix(analysis), [analysis]);

  async function copyChecklist() {
    if (!checklistText) return;
    await navigator.clipboard.writeText(checklistText);
  }

  function resetApp() {
    setScenario("");
    setSector("auto");
    setRegion("auto");
    setMode("impact");
    setActiveView("relation");
    setAnalysis(null);
    setError(null);
    setCooldownUntil(0);
  }

  return (
    <main className="app-shell">
      <aside className="workspace-panel">
        <button type="button" className="brand-row brand-button" onClick={resetApp} aria-label="LawTwin 처음으로 초기화">
          <div className="brand-mark">LT</div>
          <div>
            <h1>LawTwin</h1>
            <p>법령 영향·관계 분석</p>
          </div>
        </button>

        <div className="workspace-body">

        <p className="sidebar-guide">
          상황을 적고 <strong>Enter</strong> 또는 <strong>분석 실행</strong>을 누르세요. Gemini 무료 한도(분당 약 5회)일 때는 1~2분 기다려 주세요.
        </p>

        <form
          className="input-section"
          onSubmit={(event) => {
            event.preventDefault();
            if (!loading && scenario.trim()) runAnalysis();
          }}
        >
          <div className="section-head">
            <h2>1. 상황 입력</h2>
            <button className="icon-button" type="button" onClick={rotateScenario} aria-label="예시 상황 불러오기" title="예시 상황">
              ↺
            </button>
          </div>
          <textarea
            value={scenario}
            onChange={(event) => setScenario(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              if (!loading && scenario.trim()) runAnalysis();
            }}
            placeholder="예: 알바 주휴수당이랑 야근 수당이 헷갈려요. 뭐부터 봐야 할까요?"
            aria-label="분석할 상황"
            aria-keyshortcuts="Enter"
          />

          <div className="field-grid">
            <label>
              업종
              <select value={sector} onChange={(event) => setSector(event.target.value)}>
                {sectors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              지역
              <select value={region} onChange={(event) => setRegion(event.target.value)}>
                {regions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="mode-fieldset">
            <legend>2. 보기 방식</legend>
            <div className="mode-row">
              {modes.map((item) => (
                <button
                  key={item.id}
                  className={`mode-chip ${mode === item.id ? "active" : ""}`}
                  type="button"
                  onClick={() => changeMode(item.id)}
                  title={item.hint}
                >
                  <span>{item.label}</span>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <button
            className="primary-button"
            type="submit"
            disabled={loading || !scenario.trim() || cooldownSecondsLeft > 0}
          >
            {loading
              ? "분석 중…"
              : cooldownSecondsLeft > 0
                ? `${cooldownSecondsLeft}초 후 재시도`
                : "3. 분석 실행"}
          </button>
          {cooldownSecondsLeft > 0 ? (
            <p className="cooldown-note" role="status">
              Gemini 무료 한도(분당 약 5회) 회복을 기다리는 중입니다. {cooldownSecondsLeft}초 후에 다시 분석할 수 있습니다.
            </p>
          ) : null}
        </form>

        {analysis ? (
          <section className="input-section compact insight-card">
            <h2>추출된 조건</h2>
            <div className="tag-list">
              <span className="tag">업종: {analysis.labels.sector}</span>
              <span className="tag">지역: {analysis.labels.region}</span>
              {analysis.labels.topics.map((topic) => (
                <span className="tag" key={topic}>
                  {topic}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="input-section compact">
          <h2>연동</h2>
          <div className="tag-list">
            <span className={`tag ${analysis?.integrations?.lawApi ? "ok" : ""}`}>법제처</span>
            <span className={`tag ${analysis?.integrations?.gemini ? "ok" : ""}`}>
              Gemini{analysis?.integrations?.geminiSummary ? "·요약" : analysis?.integrations?.geminiPlan ? "·검색" : ""}
            </span>
          </div>
          {analysis?.lawSearchPlan?.error ? <p className="integration-note">검색: {analysis.lawSearchPlan.error}</p> : null}
          {analysis?.gemini?.error ? <p className="integration-note">요약: {analysis.gemini.error}</p> : null}
        </section>
        </div>

        <footer className="creator-footer">
          <span className="creator-label">제작</span>
          <span className="creator-name">Boam79</span>
        </footer>
      </aside>

      <section className="result-panel">
        <ResultTopbar analysis={analysis} version={APP_VERSION} />

        {error ? <div className="error-box">{error}</div> : null}

        {analysis?.warnings?.length ? <RateLimitNotice warnings={analysis.warnings} secondsLeft={cooldownSecondsLeft} /> : null}

        {analysis ? (
          <UserActionGuide
            ref={actionGuideRef}
            steps={analysis.nextSteps}
            activeView={activeView}
            onGoTo={setActiveView}
          />
        ) : null}

        {analysis?.dataQuality ? <DataQualityBanner quality={analysis.dataQuality} /> : null}

        {analysis ? <PlainLanguageSummary analysis={analysis} onGoTo={setActiveView} /> : null}

        {analysis ? (
          <section className="summary-grid">
            <article className="metric-panel highlight">
              <span className="metric-label">핵심 법령</span>
              <strong>{analysis.laws[0] ? analysis.laws[0].title : "-"}</strong>
              <p>{analysis.laws[0]?.evidence ?? ""}</p>
            </article>
            <article className={`metric-panel ${analysis.gemini?.retryable ? "metric-panel-warn" : ""}`}>
              <span className="metric-label">AI 요약 (Gemini)</span>
              {analysis.gemini?.text ? (
                <>
                  <strong>{analysis.gemini.text.split("\n")[0]}</strong>
                  {analysis.gemini.modelLabel ? (
                    <p className="metric-note">요약 모델: {analysis.gemini.modelLabel}</p>
                  ) : null}
                  {analysis.gemini.fallbackNote ? (
                    <p className="metric-note warn">{analysis.gemini.fallbackNote}</p>
                  ) : null}
                  {analysis.gemini.modelsTriedLabel ? (
                    <p className="metric-note">시도 순서: {analysis.gemini.modelsTriedLabel}</p>
                  ) : null}
                  <p className="metric-note">전체 요약은 아래 「2. 법령·대응」 분석 흐름과 함께 보세요.</p>
                </>
              ) : analysis.gemini?.summarySkipped && !analysis.gemini?.error ? (
                <>
                  <strong>{analysis.gemini.skipReason || "AI 요약을 생략했습니다."}</strong>
                  <p className="metric-note">체크리스트·법령·히트맵은 정상 표시됩니다.</p>
                </>
              ) : analysis.integrations?.geminiConfigured ? (
                <>
                  <strong className="metric-warn-title">
                    {analysis.gemini?.error || "요약 없음 — 체크리스트·법령 목록을 참고하세요."}
                  </strong>
                  {analysis.gemini?.modelsTriedLabel ? (
                    <p className="metric-note">시도 순서: {analysis.gemini.modelsTriedLabel}</p>
                  ) : null}
                  {analysis.gemini?.retryable ? (
                    <button className="ghost-button inline-retry" type="button" onClick={() => runAnalysis()} disabled={loading}>
                      AI 요약 다시 시도
                    </button>
                  ) : null}
                </>
              ) : (
                <strong>Gemini API 키가 없어 요약을 건너뜁니다.</strong>
              )}
            </article>
            <article className="metric-panel">
              <span className="metric-label">법제처 검색어</span>
              <div className="query-chips">
                {analysis.searchQueries?.slice(0, 4).map((query) => (
                  <span key={query}>{shortLabel(query, 18)}</span>
                ))}
              </div>
              {analysis.dataQuality?.searchQueries?.mismatch ? (
                <p className="metric-note warn">표시 법령과 검색어가 다를 수 있어요. 아래 관련 법령을 우선 보세요.</p>
              ) : null}
            </article>
          </section>
        ) : null}

        <nav className="view-tabs" aria-label="결과 보기 전환">
          <button type="button" className={activeView === "relation" ? "active" : ""} onClick={() => setActiveView("relation")}>
            <span>1. 법령 연관</span>
            <small>무엇을 같이 볼지</small>
          </button>
          <button type="button" className={activeView === "detail" ? "active" : ""} onClick={() => setActiveView("detail")}>
            <span>2. 법령·대응</span>
            <small>체크리스트·원문</small>
          </button>
          <button type="button" className={activeView === "region" ? "active" : ""} onClick={() => setActiveView("region")}>
            <span>3. 지역·업무</span>
            <small>우선순위 참고</small>
          </button>
        </nav>

        <div className="results-body">
          {activeView === "relation" ? (
            <Panel title="법령 간 연관성" badge={mode === "conflict" ? "충돌 중심" : "영향 중심"} wide>
              <TabIntro
                title="여기서 할 일"
                body="색이 진한 칸의 법령 쌍부터 함께 검토하세요. 다음 단계는 「2. 법령·대응」에서 체크리스트를 실행하는 것입니다."
              />
              <LawRelationHeatmap matrix={lawRelationMatrix} mode={mode} />
            </Panel>
          ) : null}

          {activeView === "detail" ? (
            <div className="detail-grid">
              <TabIntro
                title="여기서 할 일"
                body="왼쪽 법령의 「원문 보기」로 근거를 확인하고, 오른쪽 체크리스트에서 할 일을 하나씩 체크하세요."
                wide
              />
              <Panel
                title="관련 법령"
                badge={
                  analysis?.dataQuality?.laws?.lawApiVerified
                    ? `법제처 ${analysis.dataQuality.laws.lawApiVerified}건`
                    : analysis?.dataQuality?.laws?.label || "내부 후보"
                }
              >
                <div className="law-list">
                  {analysis?.laws.length ? (
                    analysis.laws.map((law, index) => (
                      <article className="law-item" key={law.id}>
                        <div className="law-item-head">
                          <span className="law-rank">{index + 1}</span>
                          <strong>
                            {law.title} {law.article ? `· ${law.article}` : ""}
                          </strong>
                        </div>
                        <div className="law-meta">
                          {law.source === "lawApi" ? "법제처" : law.type} · {law.agency}
                          {law.matchedQuery ? ` · ${shortLabel(law.matchedQuery, 16)}` : ""}
                        </div>
                        <p className="evidence">{law.evidence}</p>
                        {(() => {
                          const lawUrl = buildSafeLawGoKrUrl(law.detailPath);
                          return lawUrl ? (
                            <a className="law-link" href={lawUrl} target="_blank" rel="noreferrer noopener">
                              원문 보기
                            </a>
                          ) : null;
                        })()}
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">관련 법령이 없습니다. 상황을 조금 더 구체적으로 적어 보세요.</div>
                  )}
                </div>
              </Panel>

              <div className="detail-side">
                <Panel title="검토 체크리스트" badge={`할 일 ${analysis?.checklist?.length ?? 0}개`}>
                  <ChecklistExplainer description={analysis?.dataQuality?.checklist?.description} />
                  <button className="copy-button" type="button" onClick={copyChecklist}>
                    목록 복사
                  </button>
                  <div className="checklist">
                    {analysis?.checklist.map((task) => (
                      <QuestionChecklistItem key={task.title} task={task} />
                    ))}
                  </div>
                </Panel>

                <Panel title="충돌 검토 후보" badge={`${analysis?.conflicts?.length ?? 0}건`}>
                  <div className="conflict-list">
                    {analysis?.conflicts?.length ? (
                      analysis.conflicts.map((conflict) => (
                        <article className={`conflict-item ${conflict.level === "high" ? "high" : ""}`} key={conflict.title}>
                          <strong>{conflict.title}</strong>
                          <p>{conflict.detail}</p>
                        </article>
                      ))
                    ) : (
                      <div className="empty-state">직접 충돌 후보가 없습니다. 적용 범위·신고 누락을 우선 확인하세요.</div>
                    )}
                  </div>
                </Panel>
              </div>
            </div>
          ) : null}

          {activeView === "region" ? (
            <div className="region-grid">
              <TabIntro
                title="여기서 할 일"
                body="숫자가 큰 칸부터 내부 업무를 배치하세요. 공식 지역 통계나 조례 전문이 아니라, 이번 분석 법령을 바탕으로 한 검토 우선순위 지도입니다."
                wide
              />
              <Panel title="지역·업무별 검토 우선순위" badge={analysis?.dataQuality?.heatmap?.label || "참고용"} wide>
                <RegionImpactHeatmap heatmap={analysis?.heatmap ?? []} focusRegion={analysis?.labels?.region} />
              </Panel>
              <Panel title="법제처 검색 원본" badge={analysis?.lawApi?.items?.length ? `${analysis.lawApi.items.length}건` : "연동"}>
                <div className="source-list">
                  {analysis?.lawApi?.items?.length ? (
                    analysis.lawApi.items.slice(0, 12).map((law) => (
                      <article className="source-item" key={`${law.id}-${law.title}`}>
                        <strong>{law.title || "법령명 없음"}</strong>
                        <span>
                          {law.agency || "소관 미확인"} · {law.matchedQuery ? shortLabel(law.matchedQuery, 14) : ""}
                        </span>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">{analysis?.lawApi?.error || "법제처 검색 결과가 없습니다."}</div>
                  )}
                </div>
              </Panel>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
