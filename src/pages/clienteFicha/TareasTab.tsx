import { useState } from "react";
import { SeguimientoForm } from "../../components/forms/SeguimientoForm";
import { AdjuntosGaleria } from "../../components/ui/AdjuntosGaleria";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { PrioridadTareaPill } from "../../components/ui/StatusPill";
import { useSeguimientos } from "../../hooks/useSeguimientos";
import { uploadAdjuntos } from "../../services/adjuntos";
import { createSeguimiento, updateTarea } from "../../services/tareas";
import type { EstadoTarea, Tarea } from "../../types/postventaCliente";
import { formatFechaCorta } from "../../utils/format";
import { ESTADO_TAREA_LABEL } from "../../utils/tareaLabels";
import { SectionHeader, SourceTag } from "./fichaShared";

function TareaItem({ tarea, onChanged }: { tarea: Tarea; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: seguimientos, loading, refetch } = useSeguimientos(tarea.id, expanded);
  const [addingSeguimiento, setAddingSeguimiento] = useState(false);
  const [updatingEstado, setUpdatingEstado] = useState(false);

  async function handleAddSeguimiento(comentario: string, imagenes: File[]) {
    setAddingSeguimiento(true);
    try {
      const creado = await createSeguimiento(tarea.id, comentario);
      if (imagenes.length > 0) {
        await uploadAdjuntos("TAREA_SEGUIMIENTO", creado.id, imagenes);
      }
      refetch();
    } finally {
      setAddingSeguimiento(false);
    }
  }

  async function handleEstadoChange(estado: EstadoTarea) {
    setUpdatingEstado(true);
    try {
      await updateTarea(tarea.id, { estado });
      onChanged();
    } finally {
      setUpdatingEstado(false);
    }
  }

  return (
    <div className="tarea-item">
      <div className="tarea-item-header">
        <div>
          <div className="tarea-item-title">{tarea.titulo}</div>
          <div className="tarea-item-meta">
            {tarea.responsable} · <PrioridadTareaPill prioridad={tarea.prioridad} />
            {tarea.fechaVencimiento ? ` · Vence ${formatFechaCorta(tarea.fechaVencimiento)}` : ""}
          </div>
        </div>
        <select
          value={tarea.estado}
          disabled={updatingEstado}
          onChange={(event) => handleEstadoChange(event.target.value as EstadoTarea)}
        >
          {Object.entries(ESTADO_TAREA_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {tarea.descripcion && <p className="muted">{tarea.descripcion}</p>}
      <button type="button" className="btn btn-ghost" onClick={() => setExpanded((v) => !v)}>
        {expanded ? "Ocultar seguimientos" : "Ver seguimientos"}
      </button>
      {expanded && (
        <>
          {loading && <Skeleton height={40} />}
          <div className="seguimientos-list">
            {seguimientos && seguimientos.length === 0 && (
              <span className="muted">Sin seguimientos todavía.</span>
            )}
            {seguimientos?.map((s) => (
              <div key={s.id} className="seguimiento-item">
                <div>{s.comentario}</div>
                <div className="seguimiento-item-meta">
                  {s.usuario} · {new Date(s.createdAt).toLocaleString("es-PE")}
                </div>
                <AdjuntosGaleria entidadTipo="TAREA_SEGUIMIENTO" entidadId={s.id} />
              </div>
            ))}
          </div>
          <SeguimientoForm onSubmit={handleAddSeguimiento} submitting={addingSeguimiento} />
        </>
      )}
    </div>
  );
}

export function TareasTab({ tareas, onChanged }: { tareas: Tarea[]; onChanged: () => void }) {
  return (
    <div className="ficha-grid">
      <section className="card ficha-section ficha-full-width">
        <SectionHeader>
          <h2>Tareas ({tareas.length})</h2>
          <SourceTag origen="local" />
        </SectionHeader>
        {tareas.length === 0 ? (
          <EmptyState title="Sin tareas registradas" />
        ) : (
          <div className="seguimientos-list">
            {tareas.map((t) => (
              <TareaItem key={t.id} tarea={t} onChanged={onChanged} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
