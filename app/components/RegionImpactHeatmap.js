import { getHeatmapRowHint } from "../../lib/analysisMeta.js";

function RegionHeatmapRow({ row }) {
  const levelLabels = { high: "우선", mid: "권장", low: "참고", none: "약함" };

  return (
    <>
      <div className="heatmap-cell header" title={getHeatmapRowHint(row.row)}>
        {row.row}
      </div>
      {row.cells.map((cell) => {
        const lawsHint = cell.sampleLaws?.length ? ` · ${cell.sampleLaws.join(", ")}` : "";
        const title = `${row.row} · ${cell.col}: ${levelLabels[cell.level] || cell.level} (연관 ${cell.lawCount ?? cell.score}건)${lawsHint}`;
        return (
          <div className={`heatmap-cell ${cell.level}`} key={`${row.row}-${cell.col}`} title={title}>
            <span className="cell-score">{cell.score > 0 ? cell.score : "·"}</span>
            {cell.lawCount > 0 ? <span className="cell-sub">{cell.lawCount}법</span> : null}
          </div>
        );
      })}
    </>
  );
}

export default function RegionImpactHeatmap({ heatmap, focusRegion }) {
  const headers = ["업무", "서울", "경기", "부산", "전국"];
  const regionLegend = [
    { level: "high", label: "우선 검토" },
    { level: "mid", label: "검토 권장" },
    { level: "low", label: "참고" },
    { level: "none", label: "해당 약함" },
  ];

  if (!heatmap.length) {
    return <div className="empty-state">관련 법령이 없어 지역·업무 우선순위를 만들 수 없습니다.</div>;
  }

  return (
    <div className="region-heatmap-wrap">
      <p className="heatmap-intro">
        칸 숫자는 <strong>연관 법령 수 + 지역 가중</strong>입니다. 공식 지역 통계·조례가 아니라 이번 분석만 반영합니다.
        {focusRegion ? ` (추론 지역: ${focusRegion})` : ""}
      </p>
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
      <ul className="region-row-notes">
        {heatmap.map((row) => (
          <li key={row.row}>
            <strong>{row.row}</strong> — {getHeatmapRowHint(row.row)}
          </li>
        ))}
      </ul>
    </div>
  );
}
