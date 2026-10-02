import type { ReactNode } from "react";
import "./ui.css";

export function EmptyState({
  title = "Información aún no disponible",
  message,
}: {
  title?: string;
  message?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-title">{title}</div>
      {message && <div>{message}</div>}
    </div>
  );
}
