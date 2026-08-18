import "./ui.css";

export function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "critical" | "warning" | "success";
}) {
  return (
    <div className={`card kpi-card${tone ? ` kpi-card-${tone}` : ""}`}>
      <span className="kpi-card-label">{label}</span>
      <span className="kpi-card-value">{value}</span>
      {hint && <span className="kpi-card-hint">{hint}</span>}
    </div>
  );
}
