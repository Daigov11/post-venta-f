import { useMemo } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { KpiCard } from "../components/ui/KpiCard";
import { Skeleton } from "../components/ui/Skeleton";
import { useClientes } from "../hooks/useClientes";
import { useDashboardKpis } from "../hooks/useDashboardKpis";
import { formatNumber } from "../utils/format";
import "./Reportes.css";

const ANTIGUEDAD_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "0 - 6 meses", min: 0, max: 6 },
  { label: "6 - 12 meses", min: 6, max: 12 },
  { label: "1 - 2 años", min: 12, max: 24 },
  { label: "2 - 5 años", min: 24, max: 60 },
  { label: "5+ años", min: 60, max: Infinity },
];

function ReportTable({ rows }: { rows: { label: string; count: number }[] }) {
  if (rows.length === 0) return <EmptyState />;
  return (
    <table className="report-table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            <td>{formatNumber(row.count)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReportesPage() {
  const { data: kpis, loading: loadingKpis } = useDashboardKpis();
  const { data: clientes, loading: loadingClientes } = useClientes({ page: 1, pageSize: 3000 });

  const antiguedadRows = useMemo(() => {
    if (!clientes) return [];
    const counts = ANTIGUEDAD_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 }));
    let sinDeterminar = 0;
    for (const cliente of clientes.data) {
      const meses = cliente.antiguedad.meses;
      if (meses === null) {
        sinDeterminar += 1;
        continue;
      }
      const index = ANTIGUEDAD_BUCKETS.findIndex((b) => meses >= b.min && meses < b.max);
      if (index >= 0) counts[index].count += 1;
    }
    if (sinDeterminar > 0) counts.push({ label: "No determinado", count: sinDeterminar });
    return counts;
  }, [clientes]);

  // rubro ya viene resuelto por cliente (autoritativo via nSistema cuando hay
  // match con Administrativo/post-venta, heuristica de respaldo si no) — se
  // cuenta tal cual sale, sin forzar solo Restaurante/Tienda/Hotel, para no
  // esconder otros valores reales que aparezcan.
  const rubroRows = useMemo(() => {
    if (!clientes) return [];
    const counts = new Map<string, number>();
    for (const cliente of clientes.data) {
      counts.set(cliente.rubro, (counts.get(cliente.rubro) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [clientes]);

  const loading = loadingKpis || loadingClientes;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reportes</h1>
          <div className="page-header-subtitle">
            Reportes construidos únicamente con información disponible hoy
          </div>
        </div>
      </div>

      {loading && !kpis && (
        <div className="kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="card kpi-card" key={i}>
              <Skeleton height={12} width="60%" />
              <Skeleton height={28} width="40%" />
            </div>
          ))}
        </div>
      )}

      {kpis && (
        <div className="kpi-grid">
          <KpiCard label="Clientes con deuda" value={formatNumber(kpis.clientesConDeuda)} />
          <KpiCard label="Clientes sin equipo" value={formatNumber(kpis.clientesSinEquipo)} />
          <KpiCard
            label="Documentación incompleta"
            value={formatNumber(kpis.clientesDocumentacionIncompleta)}
          />
          <KpiCard
            label="Comprobantes históricos"
            value={formatNumber(kpis.comprobantesHistoricoTotal)}
          />
        </div>
      )}

      <div className="reportes-grid">
        <div className="card report-card">
          <h2>Clientes por estado post venta</h2>
          {kpis && (
            <ReportTable
              rows={[
                { label: "Normal", count: kpis.clientesPorEstado.NORMAL },
                { label: "Revisar", count: kpis.clientesPorEstado.REVISAR },
                { label: "Atención", count: kpis.clientesPorEstado.ATENCION },
              ]}
            />
          )}
        </div>

        <div className="card report-card">
          <h2>Clientes por plan</h2>
          {kpis && (
            <ReportTable rows={kpis.topPlanes.map((r) => ({ label: r.plan, count: r.count }))} />
          )}
        </div>

        <div className="card report-card">
          <h2>Clientes por periodicidad</h2>
          {kpis && (
            <ReportTable
              rows={Object.entries(kpis.clientesPorPeriodicidad).map(([label, count]) => ({
                label,
                count,
              }))}
            />
          )}
        </div>

        <div className="card report-card">
          <h2>Clientes por rubro</h2>
          <ReportTable rows={rubroRows} />
        </div>

        <div className="card report-card">
          <h2>Clientes por ejecutivo</h2>
          {kpis && (
            <ReportTable
              rows={kpis.clientesPorEjecutivo.map((r) => ({ label: r.ejecutivo, count: r.count }))}
            />
          )}
        </div>

        <div className="card report-card">
          <h2>Clientes por ubicación</h2>
          {kpis && (
            <ReportTable
              rows={kpis.distribucionDepartamentos.map((r) => ({
                label: r.departamento,
                count: r.count,
              }))}
            />
          )}
        </div>

        <div className="card report-card">
          <h2>Clientes por tipo vendedor/distribuidor</h2>
          {kpis && (
            <ReportTable rows={kpis.clientesPorTipoOs.map((r) => ({ label: r.tipo, count: r.count }))} />
          )}
        </div>

        <div className="card report-card">
          <h2>Antigüedad de cartera</h2>
          <ReportTable rows={antiguedadRows} />
        </div>
      </div>
    </div>
  );
}
