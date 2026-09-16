import type { ReactNode } from "react";
import "./ui.css";

export type BadgeTone =
  | "success"
  | "warning"
  | "critical"
  | "info"
  | "neutral"
  | "primary"
  // "local" = dato propio de la plataforma (no de APIWorking). "pending" =
  // fuente de datos pendiente de validar (nunca reutiliza "warning", para no
  // leerse como alerta). "future" = funcionalidad de otra fase ("Próximamente").
  | "local"
  | "pending"
  | "future";

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
