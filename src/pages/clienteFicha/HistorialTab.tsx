import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import type {
  Capacitacion,
  HistorialSeguimientoEvento,
  PostVentaCliente,
  SeguimientoResumen,
} from "../../types/postventaCliente";
import { CrearSeguimientoDialog } from "./CrearSeguimientoDialog";
import { HistorialEstadoBadge, SectionHeader, SourceTag } from "./fichaShared";

export function HistorialTab({
  cliente,
  numeroDocumentoCliente,
  historial,
  loadingHistorial,
  errorHistorial,
  onCargarHistorial,
  capacitaciones,
  loadingCapacitaciones,
  seguimientoPostVenta,
  onOpenSeguimientoPvDrawer,
}: {
  cliente: PostVentaCliente;
  numeroDocumentoCliente: string;
  historial: HistorialSeguimientoEvento[] | null;
  loadingHistorial: boolean;
  errorHistorial: string | null;
  onCargarHistorial: () => void;
  capacitaciones: Capacitacion[] | null;
  loadingCapacitaciones: boolean;
  seguimientoPostVenta: SeguimientoResumen | null;
  onOpenSeguimientoPvDrawer: () => void;
}) {
  const [capacitacionesAbierto, setCapacitacionesAbierto] = useState(false);
  const [onboardingAbierto, setOnboardingAbierto] = useState(false);
  const [crearSeguimientoAbierto, setCrearSeguimientoAbierto] = useState(false);

  return (
    <div className="ficha-grid">
      <section className="card ficha-section ficha-full-width">
        <SectionHeader>
          <h2>Actividad del sistema</h2>
          <SourceTag origen="apiworking" />
        </SectionHeader>
        <p className="muted">Último ingreso registrado por el cliente en su sistema.</p>
        <div className="ficha-field-list">
          <div className="ficha-field-row">
            <span className="ficha-field-label">Último ingreso</span>
            <span className="ficha-field-value">
              {cliente.ordenVigente.postVentaExtra?.fechaInactivo
                ? new Date(cliente.ordenVigente.postVentaExtra.fechaInactivo).toLocaleString("es-PE")
                : "Sin datos"}
            </span>
          </div>
          <div className="ficha-field-row">
            <span className="ficha-field-label">Hace</span>
            <span className="ficha-field-value">
              {cliente.diasSinActividad === null ? (
                "Sin datos"
              ) : cliente.diasSinActividad <= 7 ? (
                <Badge tone="success">{cliente.diasSinActividad} día(s)</Badge>
              ) : cliente.diasSinActividad <= 30 ? (
                <Badge tone="neutral">{cliente.diasSinActividad} día(s)</Badge>
              ) : (
                <Badge tone="warning">{cliente.diasSinActividad} día(s)</Badge>
              )}
            </span>
          </div>
        </div>
      </section>

      <section className="card ficha-section ficha-full-width">
        <SectionHeader>
          <h2>Historial de seguimiento{historial ? ` (${historial.length})` : ""}</h2>
          <SourceTag origen="apiworking" />
        </SectionHeader>
        <p className="muted">
          Bitácora real de APIWorking para la OS vigente ({cliente.ordenVigente.numeroOs}) — cambios
          de estado, llamadas al cliente e incidencias registradas por el equipo.
        </p>
        <div className="form-actions" style={{ justifyContent: "flex-start", marginBottom: 8 }}>
          {historial === null && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCargarHistorial}
              disabled={loadingHistorial}
            >
              {loadingHistorial ? "Cargando..." : "Ver historial completo"}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCrearSeguimientoAbierto(true)}
          >
            Registrar seguimiento
          </button>
        </div>
        {crearSeguimientoAbierto && (
          <CrearSeguimientoDialog
            numeroDocumentoCliente={numeroDocumentoCliente}
            onClose={() => setCrearSeguimientoAbierto(false)}
            onCreado={onCargarHistorial}
          />
        )}
        {errorHistorial && <p className="error-text">{errorHistorial}</p>}
        {historial !== null && historial.length === 0 && <EmptyState title="Sin historial registrado" />}
        {historial !== null && historial.length > 0 && (
          <div className="ficha-field-list">
            {historial.map((ev, i) => (
              <div key={`${ev.fecha ?? "sf"}-${i}`} className="historial-seguimiento-item">
                <div className="historial-seguimiento-item-header">
                  <HistorialEstadoBadge estado={ev.estado} />
                  <span className="historial-seguimiento-item-fecha">
                    {ev.fecha ? new Date(ev.fecha).toLocaleString("es-PE") : "Sin fecha"}
                  </span>
                </div>
                {ev.observacion && <div className="historial-seguimiento-item-obs">{ev.observacion}</div>}
                <div className="historial-seguimiento-item-persona">{ev.persona || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {seguimientoPostVenta && (
        <CollapsibleCard
          titulo="Seguimiento Post Venta (onboarding)"
          subtitulo={seguimientoPostVenta.origen === "AUTOMATICO" ? "Flujo automático" : "Importado del Excel de Ligia"}
          abierto={onboardingAbierto}
          onToggle={() => setOnboardingAbierto((v) => !v)}
          tone="local"
        >
          <div className="ficha-field-list">
            <div className="ficha-field-row">
              <span className="ficha-field-label">Estado</span>
              <span className="ficha-field-value">
                <Badge
                  tone={
                    seguimientoPostVenta.estadoPipeline === "EXITOSO"
                      ? "success"
                      : seguimientoPostVenta.estadoPipeline === "REQUIERE_ATENCION"
                        ? "critical"
                        : "neutral"
                  }
                >
                  {seguimientoPostVenta.estadoPipeline === "EXITOSO"
                    ? "Cliente exitoso"
                    : seguimientoPostVenta.estadoPipeline === "REQUIERE_ATENCION"
                      ? "Requiere atención"
                      : "En proceso"}
                </Badge>
              </span>
            </div>
            {seguimientoPostVenta.etapaActual && (
              <div className="ficha-field-row">
                <span className="ficha-field-label">Etapa actual</span>
                <span className="ficha-field-value">
                  {seguimientoPostVenta.etapaActual.label}
                  {seguimientoPostVenta.etapaActual.vencida && (
                    <>
                      {" "}
                      <Badge tone="warning">Toca contactar</Badge>
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
          <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onOpenSeguimientoPvDrawer}>
              Ver / registrar seguimiento
            </button>
          </div>
        </CollapsibleCard>
      )}

      <CollapsibleCard
        titulo="Capacitaciones"
        subtitulo="Capacitaciones y reforzamientos dictados a este cliente en APIWorking"
        abierto={capacitacionesAbierto}
        onToggle={() => setCapacitacionesAbierto((v) => !v)}
        contador={capacitaciones?.length ?? null}
        tone="info"
      >
        {loadingCapacitaciones && <Skeleton height={40} />}
        {!loadingCapacitaciones && capacitaciones !== null && capacitaciones.length === 0 && (
          <EmptyState title="Sin capacitaciones registradas" />
        )}
        {!loadingCapacitaciones && capacitaciones !== null && capacitaciones.length > 0 && (
          <div className="ficha-field-list">
            {capacitaciones.map((cap) => (
              <div key={cap.idCapacitacion} className="historial-seguimiento-item">
                <div className="historial-seguimiento-item-header">
                  <Badge
                    tone={
                      cap.estado === "CAPACITADO"
                        ? "success"
                        : cap.estado === "CANCELADA"
                          ? "critical"
                          : "warning"
                    }
                  >
                    {cap.estado === "CAPACITADO"
                      ? "Capacitado"
                      : cap.estado === "CANCELADA"
                        ? "Cancelada"
                        : "Pendiente"}
                  </Badge>
                  {cap.tipo && <Badge tone="neutral">{cap.tipo}</Badge>}
                  <span className="historial-seguimiento-item-fecha">
                    {cap.fecha ? new Date(cap.fecha).toLocaleString("es-PE") : "Sin fecha"}
                  </span>
                </div>
                <div className="historial-seguimiento-item-persona">
                  {cap.capacitador && `Capacitador: ${cap.capacitador}`}
                  {cap.modalidad && ` · Modalidad: ${cap.modalidad}`}
                  {cap.agendador && ` · Agendador: ${cap.agendador}`}
                  {cap.vendedor && ` · Vendedor: ${cap.vendedor}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      <section className="card ficha-section">
        <h2>Datos aún no disponibles</h2>
        <EmptyState message="Módulos y encuestas quedarán disponibles cuando APIWorking entregue los endpoints correspondientes. Último ingreso al sistema y renovación se ven en las pestañas correspondientes; incidencias en su propia pestaña." />
      </section>
    </div>
  );
}
