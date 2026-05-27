export default function Panel({ title, badge, children, wide = false }) {
  return (
    <section className={`panel ${wide ? "panel-wide" : ""}`}>
      <div className="section-head">
        <h3>{title}</h3>
        {badge ? <span className="pill">{badge}</span> : null}
      </div>
      {children}
    </section>
  );
}
