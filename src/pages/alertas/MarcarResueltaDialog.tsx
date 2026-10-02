import { useState, type FormEvent } from "react";

// "Marcar resuelta solo con confirmacion y motivo" (ajuste funcional Fase 3)
// — antes el motivo era opcional y se guardaba con el mismo boton que
// "Marcar vista". Mismo patron visual que CierreDialog.tsx.
export function MarcarResueltaDialog({
  titulo,
  onClose,
  onConfirm,
  submitting,
}: {
  titulo: string;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  submitting: boolean;
}) {
  const [motivo, setMotivo] = useState("");
  const valido = motivo.trim().length > 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valido) return;
    onConfirm(motivo.trim());
  }

  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Marcar alerta como resuelta</h3>
        <p className="muted">
          <strong>{titulo}</strong> — esta acción queda registrada como trazabilidad. Indica el
          motivo por el que se considera resuelta.
        </p>
        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="alerta-resuelta-motivo">Motivo</label>
            <textarea
              id="alerta-resuelta-motivo"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
            />
          </div>
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={!valido || submitting}>
              {submitting ? "Guardando..." : "Confirmar resolución"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
