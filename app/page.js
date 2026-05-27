"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AnalysisSummaryGrid from "./components/AnalysisSummaryGrid";
import ChecklistExplainer from "./components/ChecklistExplainer";
import DataQualityBanner from "./components/DataQualityBanner";
import LawRelationHeatmap from "./components/LawRelationHeatmap";
import Panel from "./components/Panel";
import PlainLanguageSummary from "./components/PlainLanguageSummary";
import QuestionChecklistItem from "./components/QuestionChecklistItem";
import RateLimitNotice from "./components/RateLimitNotice";
import RegionImpactHeatmap from "./components/RegionImpactHeatmap";
import ResultTopbar from "./components/ResultTopbar";
import ResultViewTabs from "./components/ResultViewTabs";
import TabIntro from "./components/TabIntro";
import UserActionGuide from "./components/UserActionGuide";
import WorkspacePanel from "./components/WorkspacePanel";
import { sampleScenarios } from "../lib/lawData";
import { buildLawRelationMatrix } from "../lib/lawRelationMatrix.js";
import { buildSafeLawGoKrUrl } from "../lib/security.js";
import { shortLabel } from "../lib/shortLabel.js";

const APP_VERSION = "0.5.11";

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
      <WorkspacePanel
        scenario={scenario}
        onScenarioChange={setScenario}
        sector={sector}
        onSectorChange={setSector}
        region={region}
        onRegionChange={setRegion}
        mode={mode}
        onModeChange={changeMode}
        loading={loading}
        cooldownSecondsLeft={cooldownSecondsLeft}
        analysis={analysis}
        onReset={resetApp}
        onAnalyze={() => runAnalysis()}
        onRotateScenario={rotateScenario}
      />

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

        <AnalysisSummaryGrid analysis={analysis} loading={loading} onRetryAnalysis={() => runAnalysis()} />

        <ResultViewTabs activeView={activeView} onViewChange={setActiveView} />

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
