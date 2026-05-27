"use client";

import { analysisModes, analysisRegions, analysisSectors } from "../../lib/analysisFormOptions.js";

export default function WorkspacePanel({
  scenario,
  onScenarioChange,
  sector,
  onSectorChange,
  region,
  onRegionChange,
  mode,
  onModeChange,
  loading,
  cooldownSecondsLeft,
  analysis,
  onReset,
  onAnalyze,
  onRotateScenario,
}) {
  const canAnalyze = !loading && Boolean(scenario.trim()) && cooldownSecondsLeft <= 0;

  return (
    <aside className="workspace-panel">
      <button type="button" className="brand-row brand-button" onClick={onReset} aria-label="LawTwin 처음으로 초기화">
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
            if (canAnalyze) onAnalyze();
          }}
        >
          <div className="section-head">
            <h2>1. 상황 입력</h2>
            <button className="icon-button" type="button" onClick={onRotateScenario} aria-label="예시 상황 불러오기" title="예시 상황">
              ↺
            </button>
          </div>
          <textarea
            value={scenario}
            onChange={(event) => onScenarioChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              if (canAnalyze) onAnalyze();
            }}
            placeholder="예: 알바 주휴수당이랑 야근 수당이 헷갈려요. 뭐부터 봐야 할까요?"
            aria-label="분석할 상황"
            aria-keyshortcuts="Enter"
          />

          <div className="field-grid">
            <label>
              업종
              <select value={sector} onChange={(event) => onSectorChange(event.target.value)}>
                {analysisSectors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              지역
              <select value={region} onChange={(event) => onRegionChange(event.target.value)}>
                {analysisRegions.map((item) => (
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
              {analysisModes.map((item) => (
                <button
                  key={item.id}
                  className={`mode-chip ${mode === item.id ? "active" : ""}`}
                  type="button"
                  onClick={() => onModeChange(item.id)}
                  title={item.hint}
                >
                  <span>{item.label}</span>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <button className="primary-button" type="submit" disabled={!canAnalyze}>
            {loading ? "분석 중…" : cooldownSecondsLeft > 0 ? `${cooldownSecondsLeft}초 후 재시도` : "3. 분석 실행"}
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
  );
}
