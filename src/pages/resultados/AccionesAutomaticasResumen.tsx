import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import type { ResumenEventosOperativos } from "../../types/postventaCliente";
import { tipoAccionLabel } from "../../utils/eventoOperativoLabels";

// Conteo automatico de acciones operativas reales (Fase 3, ajuste
// funcional) — deliberadamente separado del registro manual (Acciones del
// dia / AccionesEditor) para no mezclar ambos conteos hasta que exista una
// migracion funcional definida: ver nota en Resultados.tsx.
export function AccionesAutomaticasResumen({
  titulo = "Acciones automáticas registradas",
  resumen,
  loading,
  error,
  onRetry,
}: {
  titulo?: string;
  resumen: ResumenEventosOperativos | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}) {
  return (
    <section className="card ficha-section ficha-full-width">
      <h2>{titulo}</h2>
      <p className="muted">
        Contadas automáticamente a partir de acciones operativas reales (llamadas, tareas,
        incidencias, seguimientos, oportunidades y conversiones) — no reemplaza el registro manual,
        se muestra aparte para evitar el doble conteo.
      </p>

      {loading && !resumen && <Skeleton height={40} />}

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          {onRetry && (
            <button type="button" className="btn btn-ghost" onClick={onRetry}>
              Reintentar
            </button>
          )}
        </div>
      )}

      {!error && resumen && resumen.total === 0 && (
        <EmptyState title="Sin acciones automáticas registradas todavía" />
      )}

      {resumen && resumen.total > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Badge tone="success">{resumen.total} en total</Badge>
          {Object.entries(resumen.porTipo).map(([tipo, cantidad]) => (
            <Badge key={tipo} tone="neutral">
              {tipoAccionLabel(tipo)}: {cantidad}
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}
