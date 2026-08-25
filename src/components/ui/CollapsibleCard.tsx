import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "./Badge";
import { formatNumber } from "../../utils/format";
import "./ui.css";

// Panel plegable generico — mismo patron en Movimientos (mini-modulos) y
// Renovaciones (resumen por periodicidad): reduce cuanto se ve de entrada
// sin sacar ninguna funcion, el usuario decide que abrir.
export function CollapsibleCard({
  titulo,
  subtitulo,
  abierto,
  onToggle,
  contador,
  tone,
  children,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  abierto: boolean;
  onToggle: () => void;
  contador?: number | null;
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <div className="card collapsible-card">
      <button type="button" className="collapsible-card-header" onClick={onToggle}>
        <span className="collapsible-card-titulo">
          <span>
            {titulo}
            {contador != null && <Badge tone={tone ?? "neutral"}>{formatNumber(contador)}</Badge>}
          </span>
          {subtitulo && <span className="collapsible-card-subtitulo">{subtitulo}</span>}
        </span>
        <span className="collapsible-card-caret" aria-hidden="true">
          {abierto ? "▲" : "▼"}
        </span>
      </button>
      {abierto && <div className="collapsible-card-body">{children}</div>}
    </div>
  );
}
