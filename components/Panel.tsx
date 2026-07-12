export function Panel({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function ResultSlot({
  label,
  value,
  tone = "default"
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: "default" | "gold" | "red" | "small";
}) {
  return (
    <div className="slot">
      <div className="label">{label}</div>
      <div className={`value ${tone === "default" ? "" : tone}`}>{value}</div>
    </div>
  );
}

export function Field({
  label,
  children
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="field-group">
      <label>{label}</label>
      {children}
    </div>
  );
}
