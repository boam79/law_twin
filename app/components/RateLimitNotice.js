export default function RateLimitNotice({ warnings, secondsLeft }) {
  return (
    <div className="rate-limit-notice" role="alert">
      {warnings.map((warning) => (
        <p key={warning.code}>{warning.message}</p>
      ))}
      {secondsLeft > 0 ? (
        <p className="rate-limit-wait">
          <strong>{secondsLeft}초</strong> 뒤에 「분석 실행」이 다시 활성화됩니다. 그동안 아래 법령·체크리스트는 그대로 참고하세요.
        </p>
      ) : null}
    </div>
  );
}
