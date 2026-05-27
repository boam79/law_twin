import { shortLabel } from "../../lib/shortLabel.js";
import Panel from "./Panel";

export default function LawApiSourceList({ lawApi }) {
  const itemCount = lawApi?.items?.length ?? 0;

  return (
    <Panel title="법제처 검색 원본" badge={itemCount ? `${itemCount}건` : "연동"}>
      <div className="source-list">
        {itemCount ? (
          lawApi.items.slice(0, 12).map((law) => (
            <article className="source-item" key={`${law.id}-${law.title}`}>
              <strong>{law.title || "법령명 없음"}</strong>
              <span>
                {law.agency || "소관 미확인"} · {law.matchedQuery ? shortLabel(law.matchedQuery, 14) : ""}
              </span>
            </article>
          ))
        ) : (
          <div className="empty-state">{lawApi?.error || "법제처 검색 결과가 없습니다."}</div>
        )}
      </div>
    </Panel>
  );
}
