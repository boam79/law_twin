import Metric from "./Metric";

export default function ResultTopbar({ analysis, version = "0.5.9" }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">v{version}</p>
        <h2>{analysis ? `${analysis.labels.sector} · ${analysis.labels.region}` : "분석을 시작해 주세요"}</h2>
        <p className="topbar-sub">
          {analysis ? analysis.risk.priority : "왼쪽에 상황을 입력한 뒤 분석 실행을 누르면 법령 연관 히트맵이 표시됩니다."}
        </p>
      </div>
      <div className="topbar-metrics">
        <div className="status-strip">
          <Metric value={analysis?.laws.length ?? 0} label="관련 법령" />
          <Metric value={analysis?.risk.label ?? "-"} label="검토 강도" />
          <Metric value={analysis?.checklist.length ?? 0} label="대응 항목" />
        </div>
        {analysis?.dataQuality?.laws ? (
          <p className="topbar-lawapi-meta">
            {analysis.dataQuality.laws.lawApiTotal > 0
              ? `법제처 검색 ${analysis.dataQuality.laws.lawApiTotal}건 · 화면 반영 ${analysis.dataQuality.laws.lawApiVerified}건`
              : analysis.integrations?.lawApiConfigured
                ? "법제처 키 연결됨 · 이번 분석 검색 결과 없음(내부 규칙 표시)"
                : "법제처 미연동 · 내부 규칙만 표시"}
          </p>
        ) : null}
      </div>
    </header>
  );
}
