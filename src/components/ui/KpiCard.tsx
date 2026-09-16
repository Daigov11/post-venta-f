import "./ui.css";

export type KpiCardTone = "critical" | "warning" | "success" | "pending" | "future";

export function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: KpiCardTone;
}) {
  return (
    // <dl>/<dt>/<dd>: etiqueta+valor semanticos para lectores de pantalla
    // (WCAG 2.1 AA, ver Handoff Postventa) — el CSS solo selecciona por
    // clase, cambiar de <span>/<div> a <dl>/<dt>/<dd> no rompe estilos.
    <dl className={`card kpi-card${tone ? ` kpi-card-${tone}` : ""}`}>
      <dt className="kpi-card-label">{label}</dt>
      <dd className="kpi-card-value">{value}</dd>
      {/* Visible siempre (no aria-describedby oculto): en pending/future el
          hint ES la explicación accesible de por qué el valor es "—". */}
      {hint && <dd className="kpi-card-hint">{hint}</dd>}
    </dl>
  );
}
