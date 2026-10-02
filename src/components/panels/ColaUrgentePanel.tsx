import { Link } from "react-router-dom";
import { Badge, type BadgeTone } from "../ui/Badge";
import type { Alerta } from "../../types/postventaCliente";
import { formatNumber } from "../../utils/format";
import "./ColaUrgentePanel.css";

// Los primeros 3 tipos son alertas reales (mismo motor que /api/alertas, ver
// alertaRules en backend/src/engines/alertas.engine.ts) — se reutiliza el
// dato ya calculado, sin ningun endpoint ni campo nuevo. El 4to
// ("comprobantes sin enviar") no tiene fuente en el backend todavia: no es
// lo mismo que la alerta SIN_COMPROBANTES (esa es "nunca emitio nada"; esto
// es "emitio pero no envio" — confirmado como incidencia real de APIWorking,
// tipo "A1. COMPROBANTES SIN ENVIAR", ver Fase 2 Postventa). Se muestra como
// pendiente en vez de inventar el conteo o reusar el campo equivocado.
interface ColaUrgenteTipo {
  tipo: string;
  label: string;
  icon: string;
  nivelTone: BadgeTone;
}

const TIPOS_COLA_URGENTE: ColaUrgenteTipo[] = [
  { tipo: "ALTA_PENDIENTE", label: "Altas pendientes", icon: "🆕", nivelTone: "critical" },
  { tipo: "CERTIFICADO_VENCE_HOY", label: "Certificados que vencen hoy", icon: "🔴", nivelTone: "critical" },
  { tipo: "CERTIFICADO_POR_VENCER", label: "Certificados por vencer", icon: "🟡", nivelTone: "warning" },
];

export function ColaUrgentePanel({
  alertas,
  loading,
  error,
}: {
  alertas: Alerta[] | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="card cola-urgente-panel">
      <h3 className="cola-urgente-titulo">Cola urgente</h3>
      <ul className="cola-urgente-lista">
        {TIPOS_COLA_URGENTE.map((item) => {
          const count = loading || !alertas ? null : alertas.filter((a) => a.tipo === item.tipo).length;
          return (
            <li key={item.tipo} className="cola-urgente-item">
              <Link to={`/alertas?tipo=${item.tipo}`} className="cola-urgente-link">
                <span className="cola-urgente-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="cola-urgente-label">{item.label}</span>
                <Badge tone={count === null ? "neutral" : count > 0 ? item.nivelTone : "success"}>
                  {count === null ? "…" : formatNumber(count)}
                </Badge>
              </Link>
            </li>
          );
        })}
        <li className="cola-urgente-item cola-urgente-item-pending">
          <span className="cola-urgente-icon" aria-hidden="true">
            📄
          </span>
          <span className="cola-urgente-label">
            Comprobantes sin enviar
            <span className="cola-urgente-hint">
              Fuente pendiente de validación — todavía no se calcula por cliente
            </span>
          </span>
          <Badge tone="pending">—</Badge>
        </li>
      </ul>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
