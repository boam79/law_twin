import { CHECKLIST_DUE_HINTS } from "../../lib/analysisMeta.js";

export default function ChecklistExplainer({ description }) {
  return (
    <div className="checklist-explainer">
      <p className="checklist-explainer-title">이 체크리스트는 무엇인가요?</p>
      <p>{description || "관련 법령마다 미리 정의된 ‘확인할 일’을 모은 목록입니다."}</p>
      <ol>
        <li>할 일을 읽고 체크합니다.</li>
        <li>옆 근거 법령을 「원문 보기」로 열어 조항을 확인합니다.</li>
        <li>우리 기관·지역·업종에 실제로 해당하는지 담당자와 대조합니다.</li>
      </ol>
      <p className="checklist-explainer-note">법률 자문·행정처분 결과가 아닙니다. 빠진 항목은 전문가에게 확인하세요.</p>
      <div className="due-legend">
        {Object.entries(CHECKLIST_DUE_HINTS)
          .slice(0, 4)
          .map(([due, hint]) => (
            <span key={due} title={hint}>
              <em>{due}</em> {hint}
            </span>
          ))}
      </div>
    </div>
  );
}
