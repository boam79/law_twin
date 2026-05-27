import { shortLabel } from "../../lib/shortLabel.js";

export default function AnalysisSummaryGrid({ analysis, loading, onRetryAnalysis }) {
  if (!analysis) return null;

  return (
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
            {analysis.gemini.modelLabel ? <p className="metric-note">요약 모델: {analysis.gemini.modelLabel}</p> : null}
            {analysis.gemini.fallbackNote ? <p className="metric-note warn">{analysis.gemini.fallbackNote}</p> : null}
            {analysis.gemini.modelsTriedLabel ? <p className="metric-note">시도 순서: {analysis.gemini.modelsTriedLabel}</p> : null}
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
            {analysis.gemini?.modelsTriedLabel ? <p className="metric-note">시도 순서: {analysis.gemini.modelsTriedLabel}</p> : null}
            {analysis.gemini?.retryable ? (
              <button className="ghost-button inline-retry" type="button" onClick={onRetryAnalysis} disabled={loading}>
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
  );
}
