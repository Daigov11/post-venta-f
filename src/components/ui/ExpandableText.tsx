import { useState } from "react";
import "./ui.css";

// Divulgacion progresiva para texto largo (ej. mensaje/motivo de una alerta)
// — nunca trunca sin alternativa: si el texto supera maxChars se corta con
// "…" pero siempre queda un boton para ver el texto completo.
export function ExpandableText({
  text,
  maxChars = 180,
}: {
  text: string;
  maxChars?: number;
}) {
  const [expandido, setExpandido] = useState(false);
  const esLargo = text.length > maxChars;

  if (!esLargo) {
    return <span className="expandable-text">{text}</span>;
  }

  return (
    <span className="expandable-text">
      {expandido ? text : `${text.slice(0, maxChars).trimEnd()}…`}{" "}
      <button
        type="button"
        className="btn-link-inline"
        onClick={() => setExpandido((v) => !v)}
      >
        {expandido ? "Ver menos" : "Ver detalle"}
      </button>
    </span>
  );
}
