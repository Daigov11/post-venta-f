import { useState, type FormEvent } from "react";
import "./forms.css";

export function SavedViewForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (nombre: string) => void;
  onCancel?: () => void;
  submitting?: boolean;
}) {
  const [nombre, setNombre] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nombre.trim()) return;
    onSubmit(nombre.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="stack-form">
      <div className="field">
        <label htmlFor="vista-nombre">Nombre de la vista</label>
        <input
          id="vista-nombre"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          placeholder="Ej. Requieren atención"
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
          {submitting ? "Guardando..." : "Guardar vista"}
        </button>
      </div>
    </form>
  );
}
