import { useState, type FormEvent } from "react";
import { ImagenesPicker } from "../ui/ImagenesPicker";
import "./forms.css";

export function NotaForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (nota: string, imagenes: File[]) => void;
  onCancel?: () => void;
  submitting?: boolean;
}) {
  const [nota, setNota] = useState("");
  const [imagenes, setImagenes] = useState<File[]>([]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nota.trim()) return;
    onSubmit(nota.trim(), imagenes);
    setNota("");
    setImagenes([]);
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
      <ImagenesPicker files={imagenes} onChange={setImagenes} />
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
