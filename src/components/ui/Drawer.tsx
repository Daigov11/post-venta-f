import type { ReactNode } from "react";
import "./ui.css";

export function Drawer({
  open,
  onClose,
  title,
  children,
  size = "default",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  // "wide" para detalle con mucho contenido (ej. detalle de alerta con
  // motivo, regla, trazabilidad y todas las acciones) — el resto de la app
  // sigue usando el ancho por defecto.
  size?: "default" | "wide";
}) {
  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div
        className={size === "wide" ? "drawer-panel drawer-panel-wide" : "drawer-panel"}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-header">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </>
  );
}
