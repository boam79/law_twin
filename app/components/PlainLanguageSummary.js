import { buildPlainLanguageSummary } from "../../lib/plainLanguageSummary.js";

export default function PlainLanguageSummary({ analysis, onGoTo }) {
  const summary = buildPlainLanguageSummary(analysis);
  if (!summary) return null;

  return (
    <section className="plain-summary" aria-label="쉬운 설명">
      <div className="plain-summary-head">
        <h3>쉽게 설명하면</h3>
        <p>법률 자문이 아니라, 지금 할 일을 이해하기 쉽게 풀어쓴 안내입니다.</p>
      </div>

      <div className="plain-summary-grid">
        <article className="plain-card">
          <span className="plain-label">한 줄 결론</span>
          <strong>{summary.conclusion}</strong>
        </article>
        <article className="plain-card">
          <span className="plain-label">왜 이렇게 나왔나요?</span>
          <ul className="plain-list">
            {summary.because.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="plain-card">
          <span className="plain-label">그래서 지금 뭘 하면 되나요?</span>
          <ol className="plain-steps">
            {summary.actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <div className="plain-cta">
            <button type="button" className="ghost-button" onClick={() => onGoTo("detail")}>
              체크리스트로 가기
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
