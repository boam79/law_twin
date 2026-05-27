import ChecklistExplainer from "./ChecklistExplainer";
import ConflictListPanel from "./ConflictListPanel";
import LawListPanel from "./LawListPanel";
import QuestionChecklistItem from "./QuestionChecklistItem";
import Panel from "./Panel";
import TabIntro from "./TabIntro";

export default function AnalyzeDetailView({ analysis, onCopyChecklist }) {
  if (!analysis) return null;

  const lawBadge = analysis.dataQuality?.laws?.lawApiVerified
    ? `법제처 ${analysis.dataQuality.laws.lawApiVerified}건`
    : analysis.dataQuality?.laws?.label || "내부 후보";

  return (
    <div className="detail-grid">
      <TabIntro
        title="여기서 할 일"
        body="왼쪽 법령의 「원문 보기」로 근거를 확인하고, 오른쪽 체크리스트에서 할 일을 하나씩 체크하세요."
        wide
      />
      <LawListPanel laws={analysis.laws} badge={lawBadge} />
      <div className="detail-side">
        <Panel title="검토 체크리스트" badge={`할 일 ${analysis.checklist?.length ?? 0}개`}>
          <ChecklistExplainer description={analysis.dataQuality?.checklist?.description} />
          <button className="copy-button" type="button" onClick={onCopyChecklist}>
            목록 복사
          </button>
          <div className="checklist">
            {analysis.checklist.map((task) => (
              <QuestionChecklistItem key={task.title} task={task} />
            ))}
          </div>
        </Panel>
        <ConflictListPanel conflicts={analysis.conflicts} />
      </div>
    </div>
  );
}
