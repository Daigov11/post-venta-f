import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { ClienteCell } from "../../components/ui/ClienteCell";
import { Drawer } from "../../components/ui/Drawer";
import { Skeleton } from "../../components/ui/Skeleton";
import {
  EstadoTareaPill,
  OrigenTareaBadge,
  PrioridadTareaPill,
  TipoTareaPill,
} from "../../components/ui/StatusPill";
import { useEventosOperativos } from "../../hooks/useEventosOperativos";
import type { PostVentaCliente, TareaListItem } from "../../types/postventaCliente";
import { tipoAccionLabel } from "../../utils/eventoOperativoLabels";
import { ReasignarAction } from "./ReasignarAction";
import { SeguimientosSection } from "./SeguimientosSection";
import { esAbierta, postergarFecha, prioridadPorIncidencia } from "./helpers";

const ORIGEN_ENTIDAD_LABEL: Record<string, string> = {
  ALERTA: "Alerta",
  INCIDENCIA: "Incidencia",
  OPORTUNIDAD: "Oportunidad",
  CLIENTE: "Cliente",
};

function OrigenDetalle({ tarea }: { tarea: TareaListItem }) {
  if (!tarea.origenEntidadTipo || !tarea.origenEntidadId) {
    return <p className="muted">Creada manualmente, sin una entidad de origen puntual.</p>;
  }

  const etiqueta = ORIGEN_ENTIDAD_LABEL[tarea.origenEntidadTipo] ?? tarea.origenEntidadTipo;

  if (tarea.origenEntidadTipo === "INCIDENCIA") {
    const prioridad = prioridadPorIncidencia(tarea);
    return (
      <div>
        <p>
          {etiqueta} <span className="mono">#{tarea.origenEntidadId}</span>
        </p>
        {!prioridad || !prioridad.disponible ? (
          <Badge tone="pending">⚪ Estado de incidencia no disponible</Badge>
        ) : prioridad.prioritaria ? (
          <Badge tone="critical">🔴 Sigue abierta en APIWorking</Badge>
        ) : (
          <Badge tone="success">🟢 Resuelta en APIWorking</Badge>
        )}
      </div>
    );
  }

  return (
    <p>
      {etiqueta} <span className="mono">#{tarea.origenEntidadId}</span> — el título y la descripción de
      esta tarea son una copia de eso al momento de crearla.
    </p>
  );
}

export function TareaDetalleDrawer({
  tarea,
  cliente,
  onClose,
  onCompletar,
  onPostergar,
  onMarcarSeguimiento,
  onReasignado,
  procesando,
}: {
  tarea: TareaListItem;
  cliente: PostVentaCliente | undefined;
  onClose: () => void;
  onCompletar: () => void;
  onPostergar: () => void;
  onMarcarSeguimiento: () => void;
  onReasignado: () => void;
  procesando: boolean;
}) {
  const { data: historialData, loading: loadingHistorial } = useEventosOperativos({
    entidadTipo: "TAREA",
    entidadId: String(tarea.id),
  });
  const historial = historialData?.data ?? [];

  return (
    <Drawer open onClose={onClose} title={tarea.titulo} size="wide">
      <div className="tarea-detalle-badges">
        <TipoTareaPill tipo={tarea.tipo} />
        <OrigenTareaBadge origen={tarea.origen} />
        <PrioridadTareaPill prioridad={tarea.prioridad} />
        <EstadoTareaPill estado={tarea.estado} />
      </div>

      <section className="tarea-detalle-seccion">
        <h4>Descripción</h4>
        <p>{tarea.descripcion || <span className="muted">Sin descripción.</span>}</p>
      </section>

      <section className="tarea-detalle-seccion">
        <h4>Cliente</h4>
        {cliente ? (
          <ClienteCell numeroDocumentoCliente={cliente.numeroDocumentoCliente} nombreCliente={cliente.nombreCliente} sistemas={cliente.sistemas} />
        ) : (
          <p className="mono">{tarea.numeroDocumentoCliente}</p>
        )}
        <Link className="btn-link-inline" to={`/clientes/${tarea.numeroDocumentoCliente}`}>
          Ver ficha del cliente
        </Link>
      </section>

      <section className="tarea-detalle-seccion">
        <h4>Origen</h4>
        <OrigenDetalle tarea={tarea} />
      </section>

      <section className="tarea-detalle-seccion">
        <h4>Historial de cambios</h4>
        {loadingHistorial && <Skeleton height={60} />}
        {!loadingHistorial && historial.length === 0 && <p className="muted">Sin cambios registrados todavía.</p>}
        {!loadingHistorial && historial.length > 0 && (
          <ul className="tarea-detalle-historial">
            {historial.map((e) => (
              <li key={e.id}>
                <strong>{tipoAccionLabel(e.tipoAccion)}</strong>
                {e.detalle && <> — {e.detalle}</>}
                <div className="muted">
                  {e.usuario} · {new Date(e.createdAt).toLocaleString("es-PE")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SeguimientosSection tareaId={tarea.id} />

      {esAbierta(tarea) && (
        <div className="tarea-detalle-acciones">
          <button type="button" className="btn btn-primary" disabled={procesando} onClick={onCompletar}>
            {procesando ? "..." : "Completar"}
          </button>
          {tarea.estado !== "EN_PROCESO" && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={procesando}
              onClick={onMarcarSeguimiento}
            >
              {procesando ? "..." : "Marcar en seguimiento"}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            disabled={procesando}
            onClick={onPostergar}
            title={`Nueva fecha: ${postergarFecha(tarea.fechaVencimiento, 3)}`}
          >
            Postergar 3 días
          </button>
          <ReasignarAction tarea={tarea} onReasignado={onReasignado} />
        </div>
      )}
    </Drawer>
  );
}
