export default function ResultViewTabs({ activeView, onViewChange }) {
  return (
    <nav className="view-tabs" aria-label="결과 보기 전환">
      <button type="button" className={activeView === "relation" ? "active" : ""} onClick={() => onViewChange("relation")}>
        <span>1. 법령 연관</span>
        <small>무엇을 같이 볼지</small>
      </button>
      <button type="button" className={activeView === "detail" ? "active" : ""} onClick={() => onViewChange("detail")}>
        <span>2. 법령·대응</span>
        <small>체크리스트·원문</small>
      </button>
      <button type="button" className={activeView === "region" ? "active" : ""} onClick={() => onViewChange("region")}>
        <span>3. 지역·업무</span>
        <small>우선순위 참고</small>
      </button>
    </nav>
  );
}
