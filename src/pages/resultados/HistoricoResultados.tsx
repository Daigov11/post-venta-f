import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { Drawer } from "../../components/ui/Drawer";
import { FilterBar } from "../../components/ui/FilterBar";
import { Skeleton } from "../../components/ui/Skeleton";
import { useHistoricoResultados } from "../../hooks/useHistoricoResultados";
import { useResultadoDetalle } from "../../hooks/useResultadoDetalle";
import { useResumenEventosRango } from "../../hooks/useResumenEventosRango";
import type { ResultadoDiaResumen } from "../../types/postventaCliente";
import { formatCurrency } from "../../utils/format";
import { TIPO_CONVERSION_LABEL, TIPOS_CONVERSION } from "../../utils/conversionLabels";
import { AccionesAutomaticasResumen } from "./AccionesAutomaticasResumen";
import { ResumenDia } from "./ResumenDia";
import { TendenciasHistorico } from "./TendenciasHistorico";

const columns: DataTableColumn<ResultadoDiaResumen>[] = [
  { key: "fecha", label: "Fecha", render: (r) => new Date(`${r.fecha}T00:00:00`).toLocaleDateString("es-PE") },
  { key: "usuario", label: "Usuario", render: (r) => r.usuario },
  {
    key: "estado",
    label: "Estado",
    render: (r) => <Badge tone={r.estado === "CERRADO" ? "success" : "warning"}>{r.estado === "CERRADO" ? "Cerrado" : "Abierto"}</Badge>,
  },
  { key: "monto", label: "Apertura", align: "right", render: (r) => formatCurrency(r.montoApertura) },
  {
    key: "acciones",
    label: "Acciones",
    align: "right",
    render: (r) => `${r.totalRealizadas} / ${r.totalNoRealizadas}`,
  },
  {
    key: "conversiones",
    label: "Conversiones",
    align: "right",
    render: (r) => {
      if (r.totalConversiones === 0) return <span className="muted">—</span>;
      const detalle = TIPOS_CONVERSION.filter((t) => r.conversionesPorTipo[t] > 0)
        .map((t) => `${TIPO_CONVERSION_LABEL[t]}: ${r.conversionesPorTipo[t]}`)
        .join(" · ");
      return (
        <span title={detalle}>
          <strong>{r.totalConversiones}</strong>
        </span>
      );
    },
  },
  {
    key: "aviso",
    label: "Aviso",
    align: "center",
    render: (r) => (r.avisoAdministracion ? <Badge tone="critical">⚠ Sí</Badge> : <span className="muted">—</span>),
  },
];

export function HistoricoResultados({ refreshToken = 0 }: { refreshToken?: number }) {
  const [usuario, setUsuario] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const { data, loading, error, refetch } = useHistoricoResultados(
    {
      usuario: usuario || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    },
    refreshToken
  );
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const detalle = useResultadoDetalle(detalleId);
  const resumenAutoDia = useResumenEventosRango(
    detalle.data
      ? { usuario: detalle.data.usuario, desde: detalle.data.fecha, hasta: detalle.data.fecha }
      : null
  );
  const resumenAuto = resumenAutoDia.data?.data[0] ?? null;

  return (
    <>
      <section className="card ficha-section ficha-full-width">
        <h2>Histórico de días</h2>
        <FilterBar>
          <div className="field">
            <label htmlFor="historico-usuario">Usuario</label>
            <input
              id="historico-usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Todos"
            />
          </div>
          <div className="field">
            <label htmlFor="historico-desde">Desde</label>
            <input id="historico-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="historico-hasta">Hasta</label>
            <input id="historico-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </FilterBar>

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn-ghost" onClick={refetch}>
              Reintentar
            </button>
          </div>
        )}
      </section>

      <div style={{ marginTop: "var(--space-4)" }}>
        <TendenciasHistorico data={data?.data ?? null} loading={loading} />
      </div>

      <section className="card ficha-section ficha-full-width" style={{ marginTop: "var(--space-4)" }}>
        <h2>Detalle por día</h2>
        <p className="muted">Haz clic en una fila para ver la apertura, acciones, conversiones y cierre de ese día.</p>
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(r) => r.id}
          loading={loading}
          emptyMessage="Todavía no hay días registrados para este filtro."
          onRowClick={(r) => setDetalleId(r.id)}
        />
      </section>

      <Drawer
        open={detalleId !== null}
        onClose={() => setDetalleId(null)}
        title={detalle.data ? `${detalle.data.fecha} · ${detalle.data.usuario}` : "Detalle del día"}
      >
        {detalle.loading && !detalle.data && <Skeleton height={160} />}
        {detalle.error && (
          <div className="error-banner" role="alert">
            <span>{detalle.error}</span>
            <button type="button" className="btn btn-ghost" onClick={detalle.refetch}>
              Reintentar
            </button>
          </div>
        )}
        {!detalle.error && detalle.data && (
          <>
            <ResumenDia resultado={detalle.data} />
            <div style={{ marginTop: "var(--space-4)" }}>
              <AccionesAutomaticasResumen
                resumen={resumenAuto}
                loading={resumenAutoDia.loading}
                error={resumenAutoDia.error}
                onRetry={resumenAutoDia.refetch}
              />
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
