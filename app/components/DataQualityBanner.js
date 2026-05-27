export default function DataQualityBanner({ quality }) {
  return (
    <section className="data-quality-banner" aria-label="데이터 출처 안내">
      <div className="dq-item">
        <span className="dq-label">관련 법령</span>
        <strong>{quality.laws.label}</strong>
        {quality.laws.lawApiTotal > 0 ? (
          <small>
            법제처 {quality.laws.lawApiTotal}건 검색 · 화면 반영 {quality.laws.lawApiVerified}건
          </small>
        ) : (
          <small>법제처 결과 없음 — 내부 규칙 후보만 표시될 수 있음</small>
        )}
      </div>
      <div className="dq-item">
        <span className="dq-label">지역·업무 표</span>
        <strong>{quality.heatmap.label}</strong>
      </div>
      <div className="dq-item">
        <span className="dq-label">체크리스트</span>
        <strong>{quality.checklist.label}</strong>
      </div>
      {quality.searchQueries.mismatch ? <p className="dq-warn">{quality.searchQueries.note}</p> : null}
    </section>
  );
}
