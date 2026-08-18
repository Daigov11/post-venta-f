import { useState } from "react";
import { CategoryBarChart } from "../components/charts/CategoryBarChart";
import { EstadoBarChart } from "../components/charts/EstadoBarChart";
import { ChartCard } from "../components/ui/ChartCard";
import { EmptyState } from "../components/ui/EmptyState";
import { KpiCard } from "../components/ui/KpiCard";
import { Skeleton } from "../components/ui/Skeleton";
import { useDashboardKpis } from "../hooks/useDashboardKpis";
import { refreshPostVentaCache } from "../services/dashboard";
import { formatCurrency, formatNumber } from "../utils/format";
import "./Dashboard.css";

const TOP_N = 8;

export function DashboardPage() {
  const { data, loading, error, refetch } = useDashboardKpis();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshPostVentaCache();
      refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="page-header-subtitle">
            ¿Qué clientes necesitan atención y por qué?
            {data && (
              <span className="dashboard-updated">
                {" "}
                · Actualizado {new Date(data.generatedAt).toLocaleString("es-PE")}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          {refreshing ? "Actualizando..." : "Actualizar datos"}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading && !data && (
        <div className="kpi-grid">
          {Array.from({ length: 7 }).map((_, i) => (
            <div className="card kpi-card" key={i}>
              <Skeleton height={12} width="60%" />
              <Skeleton height={28} width="40%" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Clientes" value={formatNumber(data.totalClientes)} />
            <KpiCard label="Órdenes de servicio" value={formatNumber(data.totalOs)} />
            <KpiCard
              label="Deuda total"
              value={formatCurrency(data.deudaTotal)}
              tone={data.deudaTotal > 0 ? "critical" : undefined}
            />
            <KpiCard
              label="Clientes con deuda"
              value={formatNumber(data.clientesConDeuda)}
              hint={`${formatNumber(data.totalClientes - data.clientesConDeuda)} sin deuda`}
            />
            <KpiCard
              label="Clientes sin equipo"
              value={formatNumber(data.clientesSinEquipo)}
              hint={`${formatNumber(data.totalClientes - data.clientesSinEquipo)} con equipo`}
              tone="warning"
            />
            <KpiCard
              label="Documentación incompleta"
              value={formatNumber(data.clientesDocumentacionIncompleta)}
              tone="warning"
            />
            <KpiCard
              label="Comprobantes históricos"
              value={formatNumber(data.comprobantesHistoricoTotal)}
            />
          </div>

          <div className="chart-grid">
            <ChartCard title="Distribución por estado post venta">
              <EstadoBarChart data={data.clientesPorEstado} />
            </ChartCard>

            <ChartCard title="Distribución por estado (APIWorking)" subtitle="Top 8">
              {data.clientesPorEstadoApiWorking.length === 0 ? (
                <EmptyState />
              ) : (
                <CategoryBarChart
                  data={data.clientesPorEstadoApiWorking
                    .slice(0, TOP_N)
                    .map((row) => ({ label: row.estado, count: row.count }))}
                />
              )}
            </ChartCard>

            <ChartCard title="Distribución por tipo de plan" subtitle="Top 8">
              {data.topPlanes.length === 0 ? (
                <EmptyState />
              ) : (
                <CategoryBarChart
                  data={data.topPlanes.map((row) => ({ label: row.plan, count: row.count }))}
                />
              )}
            </ChartCard>

            <ChartCard title="Distribución por ejecutivo" subtitle="Top 8">
              {data.clientesPorEjecutivo.length === 0 ? (
                <EmptyState />
              ) : (
                <CategoryBarChart
                  data={data.clientesPorEjecutivo
                    .slice(0, TOP_N)
                    .map((row) => ({ label: row.ejecutivo, count: row.count }))}
                />
              )}
            </ChartCard>

            <ChartCard title="Distribución geográfica" subtitle="Top 8 departamentos">
              {data.distribucionDepartamentos.length === 0 ? (
                <EmptyState />
              ) : (
                <CategoryBarChart
                  data={data.distribucionDepartamentos
                    .slice(0, TOP_N)
                    .map((row) => ({ label: row.departamento, count: row.count }))}
                />
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
