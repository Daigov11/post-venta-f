import { EmptyState } from "../../components/ui/EmptyState";
import { ExpandableText } from "../../components/ui/ExpandableText";
import { Skeleton } from "../../components/ui/Skeleton";
import { useEventosOperativos } from "../../hooks/useEventosOperativos";
import { tipoAccionLabel } from "../../utils/eventoOperativoLabels";

// Se monta solo cuando el usuario despliega la seccion (ver CollapsibleCard:
// no renderiza children mientras esta cerrado) — evita una consulta por
// cada tarjeta de alerta visible en la cola.
export function AlertaTrazabilidad({ numeroDocumentoCliente }: { numeroDocumentoCliente: string }) {
  const { data, loading, error, refetch } = useEventosOperativos({
    numeroDocumentoCliente,
    limit: 8,
  });

  if (loading && !data) return <Skeleton height={60} />;
  if (error) {
    return (
      <div className="error-banner" role="alert">
        <span>{error}</span>
        <button type="button" className="btn btn-ghost" onClick={refetch}>
          Reintentar
        </button>
      </div>
    );
  }
  if (!data || data.data.length === 0) {
    return <EmptyState title="Sin acciones operativas registradas para este cliente todavía" />;
  }

  return (
    <div className="alerta-detalle-list">
      {data.data.map((ev) => (
        <div key={ev.id} className="alerta-detalle-item">
          <span className="alerta-detalle-etiqueta">
            {new Date(ev.createdAt).toLocaleString("es-PE")} · {ev.usuario}
          </span>
          <span className="alerta-detalle-valor">
            <strong>{tipoAccionLabel(ev.tipoAccion)}</strong>
            {ev.detalle ? <ExpandableText text={` — ${ev.detalle}`} /> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
