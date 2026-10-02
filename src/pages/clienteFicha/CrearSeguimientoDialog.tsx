import { useState, type FormEvent } from "react";
import { crearSeguimiento } from "../../services/historial";

export function CrearSeguimientoDialog({
  numeroDocumentoCliente,
  onClose,
  onCreado,
}: {
  numeroDocumentoCliente: string;
  onClose: () => void;
  onCreado: () => void;
}) {
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valido = observacion.trim().length > 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valido) return;
    setEnviando(true);
    setError(null);
    try {
      await crearSeguimiento(numeroDocumentoCliente, observacion.trim());
      onCreado();
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo registrar el seguimiento.";
      setError(message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Registrar seguimiento</h3>
        <p className="muted">
          Se registra directamente en APIWorking, sobre la orden de servicio vigente de este
          cliente, sin cambiar su estado — solo queda la observación en el historial.
        </p>
        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="seguimiento-observacion">Observación</label>
            <textarea
              id="seguimiento-observacion"
              rows={4}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={!valido || enviando}>
              {enviando ? "Registrando..." : "Registrar seguimiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
