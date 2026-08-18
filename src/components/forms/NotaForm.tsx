import { useState, type FormEvent } from "react";
import "./forms.css";

export function NotaForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (nota: string) => void;
  onCancel?: () => void;
  submitting?: boolean;
}) {
  const [nota, setNota] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nota.trim()) return;
    onSubmit(nota.trim());
    setNota("");
  }

  return (
    <form onSubmit={handleSubmit} className="stack-form">
      <div className="field">
        <label htmlFor="nota-texto">Nota</label>
        <textarea
          id="nota-texto"
          rows={3}
          value={nota}
          onChange={(event) => setNota(event.target.value)}
          required
        />
      </div>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar nota"}
        </button>
      </div>
    </form>
  );
}
