import { useMemo } from "react";
import { AccionesTrendChart, type AccionesTrendPoint } from "../../components/charts/AccionesTrendChart";
import { TrendBarChart, type TrendPoint } from "../../components/charts/TrendBarChart";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { KpiCard } from "../../components/ui/KpiCard";
import { Skeleton } from "../../components/ui/Skeleton";
import type { ResultadoDiaResumen, TipoConversion } from "../../types/postventaCliente";
import { TIPO_CONVERSION_LABEL, TIPOS_CONVERSION } from "../../utils/conversionLabels";

// Umbral confirmado explicitamente en el brief de Fase 3 ("30 o mas acciones
// realizadas, usando el total registrado") — no es una formula inventada.
const UMBRAL_ALTA_ACTIVIDAD = 30;

function formatFechaCorta(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" });
}

interface TotalesDia {
  totalRealizadas: number;
  totalNoRealizadas: number;
  conversionesPorTipo: Record<TipoConversion, number>;
}

// Las tendencias son por fecha calendario (suma entre usuarios cuando el
// filtro de usuario es "todos") — "dias con alta actividad" / "sin
// actividad" en cambio se evaluan por fila (usuario+fecha), la misma
// granularidad que ya usa la tabla de historico.
function agruparPorFecha(rows: ResultadoDiaResumen[]): [string, TotalesDia][] {
  const porFecha = new Map<string, TotalesDia>();
  for (const row of rows) {
    const actual = porFecha.get(row.fecha) ?? {
      totalRealizadas: 0,
      totalNoRealizadas: 0,
      conversionesPorTipo: { EQUIPO: 0, PLAN: 0, MODULO: 0 },
    };
    actual.totalRealizadas += row.totalRealizadas;
    actual.totalNoRealizadas += row.totalNoRealizadas;
    for (const tipo of TIPOS_CONVERSION) {
      actual.conversionesPorTipo[tipo] += row.conversionesPorTipo[tipo];
    }
    porFecha.set(row.fecha, actual);
  }
  return [...porFecha.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function TendenciasHistorico({
  data,
  loading,
}: {
  data: ResultadoDiaResumen[] | null;
  loading: boolean;
}) {
  const porFecha = useMemo(() => (data ? agruparPorFecha(data) : []), [data]);

  const accionesTrend: AccionesTrendPoint[] = useMemo(
    () =>
      porFecha.map(([fecha, v]) => ({
        label: formatFechaCorta(fecha),
        realizadas: v.totalRealizadas,
        noRealizadas: v.totalNoRealizadas,
      })),
    [porFecha]
  );

  const conversionesTrendPorTipo: Record<TipoConversion, TrendPoint[]> = useMemo(() => {
    const resultado: Record<TipoConversion, TrendPoint[]> = { EQUIPO: [], PLAN: [], MODULO: [] };
    for (const [fecha, v] of porFecha) {
      for (const tipo of TIPOS_CONVERSION) {
        resultado[tipo].push({ label: formatFechaCorta(fecha), value: v.conversionesPorTipo[tipo] });
      }
    }
    return resultado;
  }, [porFecha]);

  const hayConversiones = porFecha.some(([, v]) => TIPOS_CONVERSION.some((t) => v.conversionesPorTipo[t] > 0));
  const hayAcciones = porFecha.some(([, v]) => v.totalRealizadas > 0 || v.totalNoRealizadas > 0);

  const diasAltaActividad = useMemo(
    () => (data ?? []).filter((r) => r.totalRealizadas >= UMBRAL_ALTA_ACTIVIDAD),
    [data]
  );
  const diasSinActividad = useMemo(
    () =>
      (data ?? []).filter(
        (r) => r.totalRealizadas === 0 && r.totalNoRealizadas === 0 && r.totalConversiones === 0
      ),
    [data]
  );

  // Estado: carga (primera vez — sin datos previos que mostrar todavia).
  if (loading && !data) {
    return (
      <section className="card ficha-section ficha-full-width">
        <h2>Tendencias</h2>
        <Skeleton height={220} />
      </section>
    );
  }

  // Estado: error de la carga inicial (nunca llego a haber datos) — el
  // banner de error ya lo muestra el contenedor (HistoricoResultados), aca
  // no hay nada confiable que graficar todavia.
  if (!data) return null;

  // Estado: vacio — el filtro no trae ningun dia registrado.
  if (data.length === 0) {
    return (
      <section className="card ficha-section ficha-full-width">
        <h2>Tendencias</h2>
        <EmptyState title="Todavía no hay días registrados para este filtro" />
      </section>
    );
  }

  return (
    <div className="ficha-grid">
      <section className="card ficha-section ficha-full-width">
        <h2>Tendencia de conversiones por tipo</h2>
        {/* Estado: sin datos — hay dias en el filtro pero ninguna conversion. */}
        {!hayConversiones ? (
          <EmptyState title="Sin conversiones registradas en el rango filtrado" />
        ) : (
          <div className="tendencias-conversion-grid">
            {TIPOS_CONVERSION.map((tipo) => (
              <div key={tipo} className="tendencia-mini-chart">
                <h3>{TIPO_CONVERSION_LABEL[tipo]}</h3>
                <div className="tendencia-chart-box">
                  <TrendBarChart data={conversionesTrendPorTipo[tipo]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card ficha-section ficha-full-width">
        <h2>Tendencia de acciones realizadas y no realizadas</h2>
        {!hayAcciones ? (
          <EmptyState title="Sin acciones registradas en el rango filtrado" />
        ) : (
          <div className="tendencia-chart-box tendencia-chart-box-lg">
            <AccionesTrendChart data={accionesTrend} />
          </div>
        )}
      </section>

      <section className="card ficha-section">
        <h2>Días con alta actividad</h2>
        <p className="muted">
          {UMBRAL_ALTA_ACTIVIDAD} o más acciones realizadas en el día, usando el total registrado.
        </p>
        <KpiCard
          label="Días que superan el umbral"
          value={diasAltaActividad.length}
          tone={diasAltaActividad.length > 0 ? "success" : undefined}
        />
        {diasAltaActividad.length === 0 ? (
          <EmptyState title="Ningún día del rango filtrado alcanzó el umbral" />
        ) : (
          <div className="ficha-field-list" style={{ marginTop: "var(--space-3)" }}>
            {diasAltaActividad.map((r) => (
              <div key={r.id} className="ficha-field-row">
                <span className="ficha-field-label">
                  {formatFechaCorta(r.fecha)} · {r.usuario}
                </span>
                <span className="ficha-field-value">{r.totalRealizadas} realizadas</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card ficha-section">
        <h2>Días sin actividad registrada</h2>
        <p className="muted">Día con jornada abierta pero sin acciones ni conversiones registradas.</p>
        <KpiCard
          label="Días sin actividad"
          value={diasSinActividad.length}
          tone={diasSinActividad.length > 0 ? "warning" : undefined}
        />
        {diasSinActividad.length === 0 ? (
          <EmptyState title="Todos los días del rango filtrado tienen alguna actividad registrada" />
        ) : (
          <div className="ficha-field-list" style={{ marginTop: "var(--space-3)" }}>
            {diasSinActividad.map((r) => (
              <div key={r.id} className="ficha-field-row">
                <span className="ficha-field-label">
                  {formatFechaCorta(r.fecha)} · {r.usuario}
                </span>
                <Badge tone="neutral">Sin registros</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
