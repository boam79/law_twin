import { buildSafeLawGoKrUrl } from "../../lib/security.js";
import { shortLabel } from "../../lib/shortLabel.js";
import Panel from "./Panel";

export default function LawListPanel({ laws, badge }) {
  return (
    <Panel title="관련 법령" badge={badge}>
      <div className="law-list">
        {laws?.length ? (
          laws.map((law, index) => {
            const lawUrl = buildSafeLawGoKrUrl(law.detailPath);
            return (
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
                {lawUrl ? (
                  <a className="law-link" href={lawUrl} target="_blank" rel="noreferrer noopener">
                    원문 보기
                  </a>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="empty-state">관련 법령이 없습니다. 상황을 조금 더 구체적으로 적어 보세요.</div>
        )}
      </div>
    </Panel>
  );
}
