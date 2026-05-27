import Panel from "./Panel";

export default function ConflictListPanel({ conflicts }) {
  return (
    <Panel title="충돌 검토 후보" badge={`${conflicts?.length ?? 0}건`}>
      <div className="conflict-list">
        {conflicts?.length ? (
          conflicts.map((conflict) => (
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
  );
}
