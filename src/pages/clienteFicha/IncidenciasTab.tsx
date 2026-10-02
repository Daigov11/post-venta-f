import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import type { Incidencia } from "../../types/postventaCliente";
import { CrearIncidenciaDialog } from "../../components/panels/CrearIncidenciaDialog";
import { IncidenciaEstadoBadge, SectionHeader, SourceTag } from "./fichaShared";

export type FiltroIncidencias = "todas" | "abiertas" | "resueltas";

interface IncidenciasResp {
  data: Incidencia[];
  total: number;
  abiertas: number;
  resueltas: number;
}

const FILTROS: { value: FiltroIncidencias; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "abiertas", label: "Abiertas" },
  { value: "resueltas", label: "Resueltas" },
];

export function IncidenciasTab({
  numeroDocumentoCliente,
  incidenciasResp,
  loading,
  error,
  filtro,
  onFiltroChange,
  onCargar,
  onCrearTareaDesdeIncidencia,
}: {
  numeroDocumentoCliente: string;
  incidenciasResp: IncidenciasResp | null;
  loading: boolean;
  error: string | null;
  filtro: FiltroIncidencias;
  onFiltroChange: (filtro: FiltroIncidencias) => void;
  onCargar: () => void;
  onCrearTareaDesdeIncidencia: (inc: Incidencia) => void;
}) {
  const [crearDialogOpen, setCrearDialogOpen] = useState(false);
  const incidenciasFiltradas = (incidenciasResp?.data ?? []).filter((inc) => {
    if (filtro === "abiertas") return !inc.resuelta;
    if (filtro === "resueltas") return inc.resuelta;
    return true;
  });

  return (
    <div className="ficha-grid">
      <section className="card ficha-section ficha-full-width">
        <SectionHeader>
          <h2>Incidencias{incidenciasResp ? ` (${incidenciasResp.total})` : ""}</h2>
          <SourceTag origen="apiworking" />
        </SectionHeader>
        <p className="muted">
          Incidencias reportadas para este cliente en APIWorking, con su estado real de resolución.
          No comparten lista con notas o tareas internas — esas viven en la pestaña "Notas y
          contactos".
        </p>
        <div className="form-actions" style={{ justifyContent: "flex-start", gap: 8 }}>
          {incidenciasResp === null && (
            <button type="button" className="btn btn-secondary" onClick={onCargar} disabled={loading}>
              {loading ? "Cargando..." : "Ver incidencias"}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => setCrearDialogOpen(true)}>
            Crear incidencia
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
        {incidenciasResp !== null && incidenciasResp.total > 0 && (
          <>
            <p className="muted">
              {incidenciasResp.abiertas} abierta(s) · {incidenciasResp.resueltas} resuelta(s)
            </p>
            <div className="toolbar-row">
              {FILTROS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={filtro === f.value ? "btn btn-primary" : "btn btn-secondary"}
                  onClick={() => onFiltroChange(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}
        {incidenciasResp !== null && incidenciasResp.total === 0 && (
          <EmptyState title="Sin incidencias registradas" />
        )}
        {incidenciasResp !== null && incidenciasResp.total > 0 && incidenciasFiltradas.length === 0 && (
          <EmptyState title="Sin incidencias para este filtro" />
        )}
        {incidenciasFiltradas.length > 0 && (
          <div className="ficha-field-list">
            {incidenciasFiltradas.map((inc) => (
              <div key={inc.idIncidencia} className="historial-seguimiento-item">
                <div className="historial-seguimiento-item-header">
                  <IncidenciaEstadoBadge resuelta={inc.resuelta} />
                  <Badge tone="neutral">{inc.tipo || "Sin tipo"}</Badge>
                  <span className="historial-seguimiento-item-fecha">
                    {inc.fecha ? new Date(inc.fecha).toLocaleString("es-PE") : "Sin fecha"}
                  </span>
                </div>
                {inc.caso && <div className="historial-seguimiento-item-obs">{inc.caso}</div>}
                {inc.descripcion && inc.descripcion !== inc.caso && (
                  <div className="historial-seguimiento-item-obs">{inc.descripcion}</div>
                )}
                <div className="historial-seguimiento-item-persona">
                  Asignado a {inc.asignadoA || "—"}
                  {inc.aCargo && inc.aCargo !== "SIN ASIGNAR" && ` · A cargo de ${inc.aCargo}`}
                  {inc.reportadoPorCliente && " · Reportada por el cliente"}
                </div>
                {!inc.resuelta && (
                  <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => onCrearTareaDesdeIncidencia(inc)}
                    >
                      Crear tarea desde esta incidencia
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {crearDialogOpen && (
        <CrearIncidenciaDialog
          numeroDocumentoCliente={numeroDocumentoCliente}
          onClose={() => setCrearDialogOpen(false)}
          onCreada={onCargar}
        />
      )}
    </div>
  );
}
