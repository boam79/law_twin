"use client";

import { useEffect, useMemo, useState } from "react";
import { sampleScenarios } from "../lib/lawData";

const modes = [
  { id: "impact", label: "영향" },
  { id: "conflict", label: "충돌" },
  { id: "checklist", label: "대응" },
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
  const [scenario, setScenario] = useState(sampleScenarios[0]);
  const [sector, setSector] = useState("auto");
  const [region, setRegion] = useState("auto");
  const [mode, setMode] = useState("impact");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAnalysis(next = {}) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: next.scenario ?? scenario,
          sector: next.sector ?? sector,
          region: next.region ?? region,
          mode: next.mode ?? mode,
        }),
      });
      if (!response.ok) throw new Error(`분석 API ${response.status}`);
      setAnalysis(await response.json());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function rotateScenario() {
    const current = sampleScenarios.indexOf(scenario);
    const nextScenario = sampleScenarios[(current + 1 + sampleScenarios.length) % sampleScenarios.length];
    setScenario(nextScenario);
    runAnalysis({ scenario: nextScenario });
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    runAnalysis({ mode: nextMode });
  }

  const checklistText = useMemo(() => {
    if (!analysis) return "";
    return analysis.checklist.map((task, index) => `${index + 1}. [${task.due}] ${task.title} - ${task.evidence}`).join("\n");
  }, [analysis]);

  async function copyChecklist() {
    if (!checklistText) return;
    await navigator.clipboard.writeText(checklistText);
  }

  return (
    <main className="app-shell">
      <aside className="workspace-panel">
        <div className="brand-row">
          <div className="brand-mark">LT</div>
          <div>
            <h1>LawTwin</h1>
            <p>법령 영향·관계 분석 콘솔</p>
          </div>
        </div>

        <section className="input-section">
          <div className="section-head">
            <h2>상황 입력</h2>
            <button className="icon-button" type="button" onClick={rotateScenario} aria-label="샘플 변경">
              ↺
            </button>
          </div>
          <textarea value={scenario} onChange={(event) => setScenario(event.target.value)} />

          <div className="field-grid">
            <label>
              기관/업종
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

          <div className="mode-row">
            {modes.map((item) => (
              <button key={item.id} className={`mode-chip ${mode === item.id ? "active" : ""}`} type="button" onClick={() => changeMode(item.id)}>
                {item.label}
              </button>
            ))}
          </div>

          <button className="primary-button" type="button" onClick={() => runAnalysis()} disabled={loading}>
            {loading ? "분석 중" : "분석 실행"}
          </button>
        </section>

        <section className="input-section compact">
          <h2>추출 조건</h2>
          <div className="tag-list">
            {analysis ? (
              <>
                <span className="tag">업종: {analysis.labels.sector}</span>
                <span className="tag">지역: {analysis.labels.region}</span>
                {analysis.labels.topics.map((topic) => (
                  <span className="tag" key={topic}>
                    주제: {topic}
                  </span>
                ))}
              </>
            ) : (
              <span className="tag">분석 대기</span>
            )}
          </div>
        </section>

        <section className="input-section compact">
          <h2>연동 상태</h2>
          <div className="tag-list">
            <span className={`tag ${analysis?.integrations?.lawApi ? "ok" : ""}`}>법제처 API</span>
            <span className={`tag ${analysis?.integrations?.gemini ? "ok" : ""}`}>Gemini</span>
          </div>
        </section>
      </aside>

      <section className="result-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Prototype v0.3</p>
            <h2>{analysis ? `${analysis.labels.sector} ${analysis.labels.region} 영향 분석` : "분석 대기 중"}</h2>
          </div>
          <div className="status-strip">
            <Metric value={analysis?.laws.length ?? 0} label="관련 법령" />
            <Metric value={analysis?.risk.label ?? "-"} label="리스크" />
            <Metric value={analysis?.checklist.length ?? 0} label="대응 업무" />
          </div>
        </header>

        {error ? <div className="error-box">{error}</div> : null}

        <section className="summary-grid">
          <article className="metric-panel">
            <span className="metric-label">핵심 영향</span>
            <strong>
              {analysis?.laws[0]
                ? `${analysis.laws[0].title} ${analysis.laws[0].article} 중심으로 ${analysis.checklist.slice(0, 2).map((task) => task.title).join(", ")}이 탐지되었습니다.`
                : "입력 후 표시됩니다."}
            </strong>
          </article>
          <article className="metric-panel">
            <span className="metric-label">검토 우선순위</span>
            <strong>{analysis?.risk.priority ?? "-"}</strong>
          </article>
          <article className="metric-panel">
            <span className="metric-label">AI 요약</span>
            <strong>{analysis?.gemini?.text ? analysis.gemini.text.split("\n")[0] : "Gemini 키가 있으면 서버에서 요약합니다."}</strong>
          </article>
        </section>

        <section className="analysis-layout">
          <div className="map-row">
            <Panel title="법령 관계 지도" badge={mode === "impact" ? "영향" : mode === "conflict" ? "충돌" : "대응"}>
              <RelationshipMap analysis={analysis} />
            </Panel>
          </div>

          <div className="main-column">
            <Panel title="관련 법령" badge={analysis?.laws?.some((law) => law.source === "lawApi") ? "법제처 우선" : "조문 근거"}>
              <div className="law-list">
                {analysis?.laws.map((law) => (
                  <article className="law-item" key={law.id}>
                    <strong>
                      {law.title} {law.article}
                    </strong>
                    <div className="law-meta">
                      {law.source === "lawApi" ? "법제처 검색" : law.type} · {law.agency} · 매칭 {Math.round(law.score)}점
                      {law.matchedQuery ? ` · 검색어 ${law.matchedQuery}` : ""}
                    </div>
                    <div className="evidence">{law.evidence}</div>
                    {law.detailPath ? (
                      <a className="law-link" href={`https://www.law.go.kr${law.detailPath}`} target="_blank" rel="noreferrer">
                        법제처 원문 보기
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </Panel>
          </div>

          <div className="side-column">
            <Panel title="행정 대응 체크리스트" badge="복사">
              <button className="copy-button" type="button" onClick={copyChecklist}>
                체크리스트 복사
              </button>
              <div className="checklist">
                {analysis?.checklist.map((task) => (
                  <label className="check-item" key={task.title}>
                    <input type="checkbox" />
                    <span className="check-text">
                      <strong>{task.title}</strong>
                      <span>{task.evidence}</span>
                    </span>
                    <span className="due">{task.due}</span>
                  </label>
                ))}
              </div>
            </Panel>

            <Panel title="지역·업무 영향" badge={analysis?.labels.region ?? "자동"}>
              <Heatmap heatmap={analysis?.heatmap ?? []} />
            </Panel>

            <Panel title="충돌 가능성" badge="검토 후보">
              <div className="conflict-list">
                {analysis?.conflicts.map((conflict) => (
                  <article className={`conflict-item ${conflict.level === "high" ? "high" : ""}`} key={conflict.title}>
                    <strong>{conflict.title}</strong>
                    <p>{conflict.detail}</p>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="법제처 원본 검색" badge={analysis?.lawApi?.items?.length ? `${analysis.lawApi.items.length}건` : analysis?.lawApi?.enabled ? "연동" : "대기"}>
              <div className="source-list">
                {analysis?.lawApi?.items?.length ? (
                  analysis.lawApi.items.map((law) => (
                    <article className="source-item" key={`${law.id}-${law.title}`}>
                      <strong>{law.title || "법령명 없음"}</strong>
                      <span>
                        {law.agency || "소관부처 미확인"} · 시행 {law.enforcementDate || "미확인"} · 검색어 {law.matchedQuery}
                      </span>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">{analysis?.lawApi?.error || "환경변수 연결 후 실시간 검색 결과가 표시됩니다."}</div>
                )}
              </div>
            </Panel>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ value, label }) {
  return (
    <div>
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}

function Panel({ title, badge, children }) {
  return (
    <section className="panel">
      <div className="section-head">
        <h3>{title}</h3>
        <span className="pill">{badge}</span>
      </div>
      {children}
    </section>
  );
}

function RelationshipMap({ analysis }) {
  if (!analysis) return <div className="empty-state">분석을 실행하면 입력, 법령, 대응 업무의 관계가 표시됩니다.</div>;

  const laws = analysis.laws?.slice(0, 5) ?? [];
  const tasks = analysis.checklist?.slice(0, 4) ?? [];
  const agencies = uniqueValues(laws.map((law) => law.agency).filter(Boolean)).slice(0, 4);
  const queries = analysis.searchQueries?.slice(0, 6) ?? [];

  return (
    <div className="relationship-map">
      <section className="map-stage input-stage">
        <div className="map-stage-head">
          <span className="stage-index">1</span>
          <strong>입력 상황</strong>
        </div>
        <p className="scenario-preview">{analysis.query || "입력 대기"}</p>
        <div className="map-chip-row">
          <span>{analysis.labels.sector}</span>
          <span>{analysis.labels.region}</span>
          {analysis.labels.topics.slice(0, 3).map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
        <div className="search-terms">
          {queries.map((query) => (
            <span key={query}>{query}</span>
          ))}
        </div>
      </section>

      <section className="map-stage law-stage">
        <div className="map-stage-head">
          <span className="stage-index">2</span>
          <strong>우선 검토 법령</strong>
        </div>
        <ol className="map-law-list">
          {laws.map((law, index) => (
            <li key={law.id}>
              <span className="law-rank">{index + 1}</span>
              <span className="law-title-block">
                <strong>{law.title}</strong>
                <small>
                  {law.source === "lawApi" ? "법제처 검색" : law.type} · {law.agency || "소관부처 미확인"}
                  {law.matchedQuery ? ` · ${law.matchedQuery}` : ""}
                </small>
              </span>
              <span className="match-score">{Math.round(law.score)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="map-stage action-stage">
        <div className="map-stage-head">
          <span className="stage-index">3</span>
          <strong>다음 확인 업무</strong>
        </div>
        <div className="map-task-list">
          {tasks.map((task) => (
            <div className="map-task" key={task.title}>
              <span>{task.due}</span>
              <strong>{task.title}</strong>
            </div>
          ))}
        </div>
        <div className="agency-strip">
          {agencies.map((agency) => (
            <span key={agency}>{agency}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Heatmap({ heatmap }) {
  const headers = ["업무", "서울", "경기", "부산", "전국"];
  return (
    <div className="heatmap">
      {headers.map((header) => (
        <div className="heatmap-cell header" key={header}>
          {header}
        </div>
      ))}
      {heatmap.map((row) => (
        <FragmentRow row={row} key={row.row} />
      ))}
    </div>
  );
}

function FragmentRow({ row }) {
  return (
    <>
      <div className="heatmap-cell header">{row.row}</div>
      {row.cells.map((cell) => (
        <div className={`heatmap-cell ${cell.level}`} key={`${row.row}-${cell.col}`}>
          {cell.score}
        </div>
      ))}
    </>
  );
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}
