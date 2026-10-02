import { useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { eliminarAccion, registrarAccion } from "../../services/resultadoDia";
import type { ResultadoAccion } from "../../types/postventaCliente";

function FilaAccion({
  resultadoDiaId,
  accion,
  onChanged,
}: {
  resultadoDiaId: number;
  accion: ResultadoAccion;
  onChanged: () => void;
}) {
  const [realizadas, setRealizadas] = useState(String(accion.realizadas));
  const [noRealizadas, setNoRealizadas] = useState(String(accion.noRealizadas));
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const dirty = realizadas !== String(accion.realizadas) || noRealizadas !== String(accion.noRealizadas);

  async function handleGuardar() {
    const r = Number(realizadas);
    const nr = Number(noRealizadas);
    if (!Number.isInteger(r) || r < 0 || !Number.isInteger(nr) || nr < 0) return;
    setSaving(true);
    try {
      await registrarAccion(resultadoDiaId, { tipo: accion.tipo, realizadas: r, noRealizadas: nr });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleQuitar() {
    setRemoving(true);
    try {
      await eliminarAccion(resultadoDiaId, accion.tipo);
      onChanged();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="resultado-accion-row">
      <span className="resultado-accion-tipo">{accion.tipo}</span>
      <div className="field">
        <label htmlFor={`realizadas-${accion.id}`}>Realizadas</label>
        <input
          id={`realizadas-${accion.id}`}
          type="number"
          min={0}
          step={1}
          value={realizadas}
          onChange={(e) => setRealizadas(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`no-realizadas-${accion.id}`}>No realizadas</label>
        <input
          id={`no-realizadas-${accion.id}`}
          type="number"
          min={0}
          step={1}
          value={noRealizadas}
          onChange={(e) => setNoRealizadas(e.target.value)}
        />
      </div>
      <div className="form-actions" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="btn btn-primary" disabled={!dirty || saving} onClick={handleGuardar}>
          {saving ? "..." : "Guardar"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={removing} onClick={handleQuitar}>
          {removing ? "..." : "Quitar"}
        </button>
      </div>
    </div>
  );
}

export function AccionesEditor({
  resultadoDiaId,
  acciones,
  onChanged,
}: {
  resultadoDiaId: number;
  acciones: ResultadoAccion[];
  onChanged: () => void;
}) {
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [nuevoRealizadas, setNuevoRealizadas] = useState("0");
  const [nuevoNoRealizadas, setNuevoNoRealizadas] = useState("0");
  const [agregando, setAgregando] = useState(false);

  const tipoDuplicado = acciones.some(
    (a) => a.tipo.trim().toLowerCase() === nuevoTipo.trim().toLowerCase()
  );
  const nuevoValido =
    nuevoTipo.trim().length > 0 &&
    !tipoDuplicado &&
    Number.isInteger(Number(nuevoRealizadas)) &&
    Number(nuevoRealizadas) >= 0 &&
    Number.isInteger(Number(nuevoNoRealizadas)) &&
    Number(nuevoNoRealizadas) >= 0;

  async function handleAgregar() {
    if (!nuevoValido) return;
    setAgregando(true);
    try {
      await registrarAccion(resultadoDiaId, {
        tipo: nuevoTipo.trim(),
        realizadas: Number(nuevoRealizadas),
        noRealizadas: Number(nuevoNoRealizadas),
      });
      setNuevoTipo("");
      setNuevoRealizadas("0");
      setNuevoNoRealizadas("0");
      onChanged();
    } finally {
      setAgregando(false);
    }
  }

  return (
    <section className="card ficha-section">
      <h2>Acciones realizadas y no realizadas</h2>
      <p className="muted">
        No hay un catálogo fijo de tipos de acción todavía — escribí el tipo (ej. "Llamadas",
        "Visitas") y registrá cuántas se realizaron y cuántas no.
      </p>
      {acciones.length === 0 ? (
        <EmptyState title="Sin acciones registradas todavía" />
      ) : (
        <div className="resultado-accion-list">
          {acciones.map((a) => (
            <FilaAccion key={a.id} resultadoDiaId={resultadoDiaId} accion={a} onChanged={onChanged} />
          ))}
        </div>
      )}

      <div className="resultado-accion-row resultado-accion-nueva">
        <div className="field">
          <label htmlFor="nuevo-tipo-accion">Nuevo tipo de acción</label>
          <input
            id="nuevo-tipo-accion"
            value={nuevoTipo}
            onChange={(e) => setNuevoTipo(e.target.value)}
            placeholder="Ej. Llamadas"
          />
          {tipoDuplicado && <span className="error-text">Ese tipo ya está registrado hoy.</span>}
        </div>
        <div className="field">
          <label htmlFor="nuevo-realizadas">Realizadas</label>
          <input
            id="nuevo-realizadas"
            type="number"
            min={0}
            step={1}
            value={nuevoRealizadas}
            onChange={(e) => setNuevoRealizadas(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="nuevo-no-realizadas">No realizadas</label>
          <input
            id="nuevo-no-realizadas"
            type="number"
            min={0}
            step={1}
            value={nuevoNoRealizadas}
            onChange={(e) => setNuevoNoRealizadas(e.target.value)}
          />
        </div>
        <div className="form-actions" style={{ justifyContent: "flex-start" }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!nuevoValido || agregando}
            onClick={handleAgregar}
          >
            {agregando ? "Agregando..." : "Agregar tipo"}
          </button>
        </div>
      </div>
    </section>
  );
}
