import { useState, type FormEvent } from "react";

export function CierreDialog({
  onClose,
  onConfirm,
  submitting,
}: {
  onClose: () => void;
  onConfirm: (input: {
    observacionCierre: string | null;
    avisoAdministracion: boolean;
    motivoAviso: string | null;
  }) => void;
  submitting: boolean;
}) {
  const [observacion, setObservacion] = useState("");
  const [avisoAdministracion, setAvisoAdministracion] = useState(false);
  const [motivoAviso, setMotivoAviso] = useState("");

  const motivoValido = !avisoAdministracion || motivoAviso.trim().length > 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!motivoValido) return;
    onConfirm({
      observacionCierre: observacion.trim() || null,
      avisoAdministracion,
      motivoAviso: avisoAdministracion ? motivoAviso.trim() : null,
    });
  }

  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Cerrar día</h3>
        <p className="muted">
          Esta acción es definitiva: una vez cerrado, el día ya no se puede editar.
        </p>
        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="cierre-observacion">Observación de cierre (opcional)</label>
            <textarea
              id="cierre-observacion"
              rows={3}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Notas libres sobre cómo fue el día"
            />
          </div>
          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={avisoAdministracion}
              onChange={(e) => setAvisoAdministracion(e.target.checked)}
            />
            Requiere aviso a administración
          </label>
          {avisoAdministracion && (
            <div className="field">
              <label htmlFor="cierre-motivo">Motivo del aviso</label>
              <textarea
                id="cierre-motivo"
                rows={2}
                value={motivoAviso}
                onChange={(e) => setMotivoAviso(e.target.value)}
                required
              />
              {!motivoValido && (
                <span className="error-text">El motivo es obligatorio si marcás el aviso.</span>
              )}
            </div>
          )}
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={!motivoValido || submitting}>
              {submitting ? "Cerrando..." : "Cerrar día"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
