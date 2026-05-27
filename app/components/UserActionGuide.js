"use client";

import { forwardRef } from "react";

const UserActionGuide = forwardRef(function UserActionGuide({ steps, activeView, onGoTo }, ref) {
  if (!steps?.length) return null;

  return (
    <section ref={ref} className="action-guide" aria-label="분석 결과 이용 안내">
      <div className="action-guide-head">
        <h3>이렇게 보세요</h3>
        <p>법률 자문이 아니라, 검토 순서를 돕는 가이드입니다.</p>
      </div>
      <ol className="action-steps">
        {steps.slice(0, 5).map((step) => (
          <li key={step.id} className={step.tab && activeView === step.tab ? "current" : ""}>
            <div className="action-step-body">
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </div>
            {step.tab ? (
              <button type="button" className="ghost-button" onClick={() => onGoTo(step.tab)}>
                {activeView === step.tab ? "보는 중" : "열기"}
              </button>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
});

export default UserActionGuide;
