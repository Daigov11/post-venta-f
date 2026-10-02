import { useAuth } from "../../context/AuthContext";
import { Skeleton } from "../../components/ui/Skeleton";
import { useEventosOperativos } from "../../hooks/useEventosOperativos";
import { tipoAccionLabel } from "../../utils/eventoOperativoLabels";

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// "También yo podría ver mis acciones del día en la bolsa" (pedido
// explicito) — reusa GET /api/eventos-operativos ya existente, filtrado al
// usuario logueado (nunca a otro: no se introduce ninguna vista de terceros
// aca, cada quien ve solo lo suyo).
export function MisAccionesHoy({ refreshToken }: { refreshToken: number }) {
  const { username } = useAuth();
  const hoy = hoyIso();
  const { data, loading, error } = useEventosOperativos(
    { usuario: username ?? undefined, desde: hoy, hasta: hoy, limit: 100 },
    refreshToken
  );
  const eventos = data?.data ?? [];

  return (
    <section className="card ficha-section ficha-full-width">
      <h3 style={{ marginTop: 0 }}>Mis acciones de hoy</h3>
      {loading && <Skeleton height={60} />}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && eventos.length === 0 && (
        <p className="muted">Todavía no hay acciones registradas hoy.</p>
      )}
      {!loading && eventos.length > 0 && (
        <ul className="tarea-detalle-historial">
          {eventos.map((e) => (
            <li key={e.id}>
              <strong>{tipoAccionLabel(e.tipoAccion)}</strong>
              {e.detalle && <> — {e.detalle}</>}
              <div className="muted">{new Date(e.createdAt).toLocaleTimeString("es-PE")}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
