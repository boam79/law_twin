const relationLegend = [
  { level: "high", label: "충돌·긴장", description: "함께 검토 시 주의" },
  { level: "mid", label: "연관", description: "같은 쟁점에서 연결" },
  { level: "low", label: "약한 연관", description: "동일 부처·검색어 등" },
  { level: "none", label: "없음", description: "직접 연결 없음" },
];

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

export default function LawRelationHeatmap({ matrix, mode }) {
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
