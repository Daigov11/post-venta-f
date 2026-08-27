import type { ClienteSistemas } from "../../types/postventaCliente";
import "./ui.css";

// Solo APIWorking (cantidad de OS), APILoyalty y DonChat tienen una señal
// real hoy (texto del plan de la OS — ver calcularSistemas en el backend).
// SIRE Contable, API Review y POS quedan siempre en gris: no inventamos que
// un cliente los tiene sin un dato real que lo respalde.
const EXTRA_SISTEMAS: { key: keyof Omit<ClienteSistemas, "apiWorking">; icono: string; label: string }[] = [
  { key: "apiLoyalty", icono: "🎁", label: "APILoyalty" },
  { key: "donChat", icono: "💬", label: "DonChat" },
  { key: "sireContable", icono: "📊", label: "SIRE Contable" },
  { key: "apiReview", icono: "⭐", label: "API Review" },
  { key: "pos", icono: "🧾", label: "POS" },
];

export function SistemasBadges({ sistemas }: { sistemas: ClienteSistemas | null | undefined }) {
  // Defensivo: en produccion se vio un caso donde llegaba undefined (dato
  // faltante en el origen para ese cliente) — antes tumbaba toda la fila/pagina.
  if (!sistemas) return null;
  return (
    <div className="sistemas-badges">
      <span
        className={`sistema-badge${sistemas.apiWorking > 0 ? " activo" : ""}`}
        title={`APIWorking${sistemas.apiWorking > 1 ? ` — ${sistemas.apiWorking} sistemas` : ""}`}
      >
        🖥️
        {sistemas.apiWorking > 1 && <span className="sistema-badge-count">×{sistemas.apiWorking}</span>}
      </span>
      {EXTRA_SISTEMAS.map((s) => (
        <span key={s.key} className={`sistema-badge${sistemas[s.key] ? " activo" : ""}`} title={s.label}>
          {s.icono}
        </span>
      ))}
    </div>
  );
}
