import { CHECKLIST_DUE_HINTS } from "../../lib/analysisMeta.js";
import { taskTitleToNeededInfo, taskTitleToQuestion } from "../../lib/plainLanguageSummary.js";

export default function QuestionChecklistItem({ task }) {
  const question = taskTitleToQuestion(task.title);
  const needed = taskTitleToNeededInfo(task.title);

  return (
    <details className="check-item check-item-q">
      <summary className="check-summary">
        <input type="checkbox" aria-label={`${question} 체크`} onClick={(e) => e.stopPropagation()} />
        <span className="check-text">
          <strong>{question}</strong>
          <span className="check-evidence">근거: {task.evidence}</span>
        </span>
        <span className="due" title={CHECKLIST_DUE_HINTS[task.due] || task.due}>
          {task.due}
        </span>
      </summary>
      <div className="check-detail">
        <p className="check-detail-note">
          원래 항목: <strong>{task.title}</strong>
        </p>
        {needed.length ? (
          <>
            <p className="check-detail-title">이걸 확인하려면 보통 이런 정보가 필요해요</p>
            <ul>
              {needed.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="check-detail-title">원문 보기에서 해당 조항의 적용 범위를 확인해 주세요.</p>
        )}
      </div>
    </details>
  );
}
