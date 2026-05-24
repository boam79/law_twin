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
  { id: "workplace", label: "노동·인사" },
  { id: "enterprise", label: "기업 준법" },
  { id: "public", label: "공공기관·지자체" },
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
            <p className="eyebrow">Prototype v0.2</p>
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
          <div className="visual-column">
            <Panel title="법령 관계 네트워크" badge={mode === "impact" ? "영향" : mode === "conflict" ? "충돌" : "대응"}>
              <LawGraph graph={analysis?.graph} />
            </Panel>

            <Panel title="지역·업무 영향" badge={analysis?.labels.region ?? "자동"}>
              <Heatmap heatmap={analysis?.heatmap ?? []} />
            </Panel>
          </div>

          <div className="detail-column">
            <Panel title="관련 법령" badge="조문 근거">
              <div className="law-list">
                {analysis?.laws.map((law) => (
                  <article className="law-item" key={law.id}>
                    <strong>
                      {law.title} {law.article}
                    </strong>
                    <div className="law-meta">
                      {law.type} · {law.agency} · 매칭 {Math.round(law.score)}점
                    </div>
                    <div className="evidence">{law.evidence}</div>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="법제처 API 검색" badge={analysis?.lawApi?.enabled ? "연동" : "대기"}>
              <div className="law-list">
                {analysis?.lawApi?.items?.length ? (
                  analysis.lawApi.items.map((law) => (
                    <article className="law-item compact" key={`${law.id}-${law.title}`}>
                      <strong>{law.title || "법령명 없음"}</strong>
                      <div className="law-meta">
                        {law.agency || "소관부처 미확인"} · 시행 {law.enforcementDate || "미확인"}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">{analysis?.lawApi?.error || "환경변수 연결 후 실시간 검색 결과가 표시됩니다."}</div>
                )}
              </div>
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

function LawGraph({ graph }) {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const positioned = positionNodes(nodes);
  const nodeById = new Map(positioned.map((node) => [node.id, node]));

  return (
    <svg className="law-graph" viewBox="0 0 760 420" role="img" aria-label="법령 관계 그래프">
      {edges.map((edge, index) => {
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        if (!from || !to) return null;
        return <line key={`${edge.from}-${edge.to}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={`edge ${edge.type}`} />;
      })}
      {positioned.map((node) => (
        <g key={node.id} className={`node node-${node.group}`} transform={`translate(${node.x} ${node.y})`}>
          <circle r={node.group === "query" ? 42 : node.group === "law" ? 34 : 30} />
          <text textAnchor="middle" dy="4">
            {compactLabel(node.label, node.group === "query" ? 8 : 9)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function positionNodes(nodes) {
  const laws = nodes.filter((node) => node.group === "law");
  const tasks = nodes.filter((node) => node.group === "task");
  const agencies = nodes.filter((node) => node.group === "agency");
  const region = nodes.find((node) => node.group === "region");
  const query = nodes.find((node) => node.group === "query");

  return [
    query ? { ...query, x: 380, y: 210 } : null,
    ...laws.map((node, index) => ({ ...node, x: 160, y: 70 + index * 70 })),
    ...tasks.map((node, index) => ({ ...node, x: 600, y: 85 + index * 78 })),
    ...agencies.map((node, index) => ({ ...node, x: 290 + index * 94, y: 42 })),
    region ? { ...region, x: 380, y: 370 } : null,
  ].filter(Boolean);
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

function compactLabel(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
