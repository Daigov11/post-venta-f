import { useState, type FormEvent } from "react";
import "./forms.css";

export function SeguimientoForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (comentario: string) => void;
  submitting?: boolean;
}) {
  const [comentario, setComentario] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!comentario.trim()) return;
    onSubmit(comentario.trim());
    setComentario("");
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <textarea
        rows={2}
        value={comentario}
        onChange={(event) => setComentario(event.target.value)}
        placeholder="Agregar seguimiento..."
        required
      />
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Enviando..." : "Agregar"}
      </button>
    </form>
  );
}
