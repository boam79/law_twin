export default function TabIntro({ title, body, wide = false }) {
  return (
    <div className={`tab-intro ${wide ? "tab-intro-wide" : ""}`}>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
