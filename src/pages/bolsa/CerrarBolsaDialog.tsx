import { useState, type FormEvent } from "react";

export function CerrarBolsaDialog({
  onClose,
  onConfirm,
  submitting,
}: {
  onClose: () => void;
  onConfirm: (observacion: string | null) => void;
  submitting: boolean;
}) {
  const [observacion, setObservacion] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onConfirm(observacion.trim() || null);
  }

  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Cerrar la bolsa</h3>
        <p className="muted">
          Podés volver a abrirla más tarde si hace falta — cerrar no es definitivo.
        </p>
        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="bolsa-cierre-observacion">Observación (opcional)</label>
            <textarea
              id="bolsa-cierre-observacion"
              rows={3}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Notas libres sobre cómo fue"
            />
          </div>
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Cerrando..." : "Cerrar bolsa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
