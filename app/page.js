"use client";

import { useEffect, useMemo, useState } from "react";
import { sampleScenarios } from "../lib/lawData";
import { buildSafeLawGoKrUrl } from "../lib/security.js";

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

const relationLegend = [
  { level: "high", label: "충돌·긴장", description: "함께 검토 시 주의" },
  { level: "mid", label: "연관", description: "같은 쟁점에서 연결" },
  { level: "low", label: "약한 연관", description: "동일 부처·검색어 등" },
  { level: "none", label: "없음", description: "직접 연결 없음" },
];

export default function Home() {
  const [scenario, setScenario] = useState(sampleScenarios[0]);
  const [sector, setSector] = useState("auto");
  const [region, setRegion] = useState("auto");
  const [mode, setMode] = useState("impact");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("relation");

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

  const lawRelationMatrix = useMemo(() => buildLawRelationMatrix(analysis), [analysis]);

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
            <p>법령 영향·관계 분석</p>
          </div>
        </div>

        <p className="sidebar-guide">상황을 일상 말로 적고 분석을 누르세요. 결과는 오른쪽에서 법령 연관 히트맵으로 먼저 확인할 수 있습니다.</p>

        <section className="input-section">
          <div className="section-head">
            <h2>1. 상황 입력</h2>
            <button className="icon-button" type="button" onClick={rotateScenario} aria-label="샘플 예시 바꾸기">
              ↺
            </button>
          </div>
          <textarea
            value={scenario}
            onChange={(event) => setScenario(event.target.value)}
            placeholder="예: 알바 주휴수당이랑 야근 수당이 헷갈려요. 뭐부터 봐야 할까요?"
            aria-label="분석할 상황"
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

          <button className="primary-button" type="button" onClick={() => runAnalysis()} disabled={loading}>
            {loading ? "분석 중…" : "3. 분석 실행"}
          </button>
        </section>

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
      </aside>

      <section className="result-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Prototype v0.4</p>
            <h2>{analysis ? `${analysis.labels.sector} · ${analysis.labels.region}` : "분석을 시작해 주세요"}</h2>
            <p className="topbar-sub">
              {analysis ? analysis.risk.priority : "왼쪽에 상황을 입력한 뒤 분석 실행을 누르면 법령 연관 히트맵이 표시됩니다."}
            </p>
          </div>
          <div className="status-strip">
            <Metric value={analysis?.laws.length ?? 0} label="관련 법령" />
            <Metric value={analysis?.risk.label ?? "-"} label="검토 강도" />
            <Metric value={analysis?.checklist.length ?? 0} label="대응 항목" />
          </div>
        </header>

        {error ? <div className="error-box">{error}</div> : null}

        {analysis ? (
          <section className="summary-grid">
            <article className="metric-panel highlight">
              <span className="metric-label">핵심 법령</span>
              <strong>{analysis.laws[0] ? analysis.laws[0].title : "-"}</strong>
              <p>{analysis.laws[0]?.evidence ?? ""}</p>
            </article>
            <article className="metric-panel">
              <span className="metric-label">AI 요약</span>
              <strong>
                {analysis.gemini?.text
                  ? analysis.gemini.text.split("\n")[0]
                  : analysis.integrations?.geminiConfigured
                    ? analysis.gemini?.error || "요약 없음 — 아래 히트맵·법령 목록을 참고하세요."
                    : "Gemini 연결 시 요약이 표시됩니다."}
              </strong>
            </article>
            <article className="metric-panel">
              <span className="metric-label">검색어</span>
              <div className="query-chips">
                {analysis.searchQueries?.slice(0, 4).map((query) => (
                  <span key={query}>{shortLabel(query, 18)}</span>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        <nav className="view-tabs" aria-label="결과 보기 전환">
          <button type="button" className={activeView === "relation" ? "active" : ""} onClick={() => setActiveView("relation")}>
            법령 연관 히트맵
          </button>
          <button type="button" className={activeView === "detail" ? "active" : ""} onClick={() => setActiveView("detail")}>
            법령·대응 상세
          </button>
          <button type="button" className={activeView === "region" ? "active" : ""} onClick={() => setActiveView("region")}>
            지역·업무 영향
          </button>
        </nav>

        <div className="results-body">
          {activeView === "relation" ? (
            <Panel title="법령 간 연관성" badge={mode === "conflict" ? "충돌 중심" : "영향 중심"} wide>
              <LawRelationHeatmap matrix={lawRelationMatrix} mode={mode} />
            </Panel>
          ) : null}

          {activeView === "detail" ? (
            <div className="detail-grid">
              <Panel title="관련 법령" badge={analysis?.laws?.some((law) => law.source === "lawApi") ? "법제처" : "내부 후보"}>
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
                <Panel title="행정 대응" badge="체크리스트">
                  <button className="copy-button" type="button" onClick={copyChecklist}>
                    목록 복사
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
              <Panel title="지역·업무별 영향 강도" badge={analysis?.labels.region ?? "자동"} wide>
                <RegionImpactHeatmap heatmap={analysis?.heatmap ?? []} />
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

function Metric({ value, label }) {
  return (
    <div>
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}

function Panel({ title, badge, children, wide = false }) {
  return (
    <section className={`panel ${wide ? "panel-wide" : ""}`}>
      <div className="section-head">
        <h3>{title}</h3>
        {badge ? <span className="pill">{badge}</span> : null}
      </div>
      {children}
    </section>
  );
}

function LawRelationHeatmap({ matrix, mode }) {
  if (!matrix?.laws?.length) {
    return <div className="empty-state">분석 후 법령끼리 어떻게 연결되는지 색으로 표시됩니다.</div>;
  }

  return (
    <div className="law-relation-heatmap">
      <p className="heatmap-intro">
        가로·세로 법령이 만나는 칸의 색이 연관 강도입니다. {mode === "conflict" ? "붉은색" : "진한 색"}일수록 함께 검토할 필요가 큽니다.
      </p>

      <div className="heatmap-legend" aria-label="연관 강도 범례">
        {relationLegend.map((item) => (
          <div className="legend-item" key={item.level}>
            <span className={`legend-swatch ${item.level}`} aria-hidden />
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </div>
        ))}
      </div>

      <div className="law-matrix-scroll">
        <div
          className="law-matrix"
          role="grid"
          aria-label="법령 간 연관성 히트맵"
          style={{ gridTemplateColumns: `minmax(108px, 1.4fr) repeat(${matrix.laws.length}, minmax(72px, 1fr))` }}
        >
          <div className="law-matrix-corner header" role="columnheader">
            법령
          </div>
          {matrix.laws.map((law) => (
            <div className="law-matrix-header header" role="columnheader" key={`col-${law.id}`} title={law.title}>
              {law.shortTitle}
            </div>
          ))}

          {matrix.laws.map((rowLaw, rowIndex) => (
            <LawMatrixRow key={rowLaw.id} rowLaw={rowLaw} rowIndex={rowIndex} cells={matrix.cells[rowIndex]} columnLaws={matrix.laws} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LawMatrixRow({ rowLaw, rowIndex, cells, columnLaws }) {
  return (
    <>
      <div className="law-matrix-row-label header" role="rowheader" title={rowLaw.title}>
        <span className="row-index">{rowIndex + 1}</span>
        {rowLaw.shortTitle}
      </div>
      {cells.map((cell, columnIndex) => (
        <div
          key={`${rowLaw.id}-${columnLaws[columnIndex].id}`}
          className={`law-matrix-cell ${cell.level}`}
          role="gridcell"
          title={`${rowLaw.title} ↔ ${columnLaws[columnIndex].title}: ${cell.label || "연관 없음"}`}
          aria-label={`${rowLaw.shortTitle}와 ${columnLaws[columnIndex].shortTitle}, ${cell.label || "연관 없음"}`}
        >
          <span className="cell-label">{cell.label}</span>
        </div>
      ))}
    </>
  );
}

function RegionImpactHeatmap({ heatmap }) {
  const headers = ["업무", "서울", "경기", "부산", "전국"];
  const regionLegend = [
    { level: "high", label: "높음" },
    { level: "mid", label: "보통" },
    { level: "low", label: "낮음" },
  ];

  if (!heatmap.length) {
    return <div className="empty-state">지역·업무별 영향 데이터가 없습니다.</div>;
  }

  return (
    <div className="region-heatmap-wrap">
      <p className="heatmap-intro">업무 유형과 지역 조합별로 검토 강도가 얼마나 높은지 보여 줍니다.</p>
      <div className="heatmap-legend compact" aria-label="영향 강도 범례">
        {regionLegend.map((item) => (
          <div className="legend-item" key={item.level}>
            <span className={`legend-swatch ${item.level}`} aria-hidden />
            <strong>{item.label}</strong>
          </div>
        ))}
      </div>
      <div className="heatmap region-heatmap">
        {headers.map((header) => (
          <div className="heatmap-cell header" key={header}>
            {header}
          </div>
        ))}
        {heatmap.map((row) => (
          <RegionHeatmapRow row={row} key={row.row} />
        ))}
      </div>
    </div>
  );
}

function RegionHeatmapRow({ row }) {
  return (
    <>
      <div className="heatmap-cell header">{row.row}</div>
      {row.cells.map((cell) => (
        <div className={`heatmap-cell ${cell.level}`} key={`${row.row}-${cell.col}`} title={`${row.row} · ${cell.col}: ${cell.score}`}>
          {cell.score}
        </div>
      ))}
    </>
  );
}

function buildLawRelationMatrix(analysis) {
  if (!analysis?.laws?.length) return { laws: [], cells: [] };

  const laws = dedupeLawsForMatrix(analysis.laws).slice(0, 7);
  const edges = analysis.graph?.edges ?? [];

  const cells = laws.map((rowLaw) =>
    laws.map((columnLaw) => scoreLawRelation(rowLaw, columnLaw, { edges, conflicts: analysis.conflicts ?? [] })),
  );

  return { laws, cells };
}

function dedupeLawsForMatrix(laws) {
  const seen = new Set();
  const result = [];

  laws.forEach((law) => {
    const base = baseLawTitle(law.title);
    if (seen.has(base)) return;
    seen.add(base);
    result.push({
      id: law.id,
      title: law.title,
      shortTitle: shortLabel(base, 14),
      agency: law.agency,
      matchedQuery: law.matchedQuery,
      relations: law.relations ?? [],
    });
  });

  return result;
}

function scoreLawRelation(lawA, lawB, context) {
  if (lawA.id === lawB.id) return { level: "self", label: "—", score: 0 };

  const edge = context.edges.find(
    (item) => (item.from === lawA.id && item.to === lawB.id) || (item.from === lawB.id && item.to === lawA.id),
  );
  if (edge?.type === "conflict") return { level: "high", label: "충돌", score: 3 };

  const relation = lawA.relations?.find(
    (item) => item.target === lawB.id || lawB.title.includes(item.target) || baseLawTitle(lawB.title).includes(item.target),
  );
  if (relation?.type === "tension") return { level: "high", label: "긴장", score: 3 };
  if (relation) return { level: "mid", label: "연관", score: 2 };

  const conflict = context.conflicts.find(
    (item) =>
      item.laws?.some((name) => lawA.title.includes(name) || name.includes(lawA.title)) &&
      item.laws?.some((name) => lawB.title.includes(name) || name.includes(lawB.title)),
  );
  if (conflict) {
    return { level: conflict.level === "high" ? "high" : "mid", label: "검토", score: conflict.level === "high" ? 3 : 2 };
  }

  if (lawA.agency && lawA.agency === lawB.agency && lawA.agency !== "소관부처 미확인") {
    return { level: "low", label: "동일 부처", score: 1 };
  }
  if (lawA.matchedQuery && lawA.matchedQuery === lawB.matchedQuery) {
    return { level: "low", label: "동일 검색", score: 1 };
  }

  return { level: "none", label: "", score: 0 };
}

function baseLawTitle(title) {
  return String(title || "")
    .replace(/\s*시행령.*$/u, "")
    .replace(/\s*시행규칙.*$/u, "")
    .trim();
}

function shortLabel(value, max = 16) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}
