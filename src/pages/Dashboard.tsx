import { useState } from "react";
import { Link } from "react-router-dom";
import { ColaUrgentePanel } from "../components/panels/ColaUrgentePanel";
import { CollapsibleCard } from "../components/ui/CollapsibleCard";
import { KpiCard } from "../components/ui/KpiCard";
import { Skeleton } from "../components/ui/Skeleton";
import { useAlertas } from "../hooks/useAlertas";
import { useDashboardKpis } from "../hooks/useDashboardKpis";
import { useHistoricoResultados } from "../hooks/useHistoricoResultados";
import { useTareas } from "../hooks/useTareas";
import { refreshPostVentaCache } from "../services/dashboard";
import { formatCurrency, formatNumber } from "../utils/format";
import "./Dashboard.css";

// Mismo criterio de "hoy" que el resto del panel (backend corre con
// TZ=America/Lima, ver backend/package.json) — comparacion por
// year/month/day locales, no por substring ISO (evita corrimientos de huso).
function esHoyOAntes(fechaIso: string | null): boolean {
  if (!fechaIso) return false;
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  return new Date(fechaIso) <= hoy;
}

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DashboardPage() {
  const { data, loading, error, refetch } = useDashboardKpis();
  // Sin filtro de "hoy" en el backend (no existe ese parametro en GET
  // /tareas) — se trae todo lo no cerrado y se acota en el cliente, mismo
  // patron que ya usan Renovaciones.tsx/Tareas.tsx para sus propios calculos.
  const { data: tareas, loading: loadingTareas, error: errorTareas } = useTareas({});
  // Sin filtro por tipo (la API solo filtra a un tipo por request) — se trae
  // todo lo abierto y se cuenta por tipo en el cliente, ver ColaUrgentePanel.
  const { data: alertasData, loading: loadingAlertas, error: errorAlertas } = useAlertas({});
  // Resultados y cierre diario (Fase 3) — todos los usuarios, solo hoy.
  const hoy = hoyISO();
  const { data: resultadosHoy, loading: loadingResultadosHoy } = useHistoricoResultados({
    desde: hoy,
    hasta: hoy,
  });
  const conversionesHoy = (resultadosHoy?.data ?? []).reduce((acc, r) => acc + r.totalConversiones, 0);

  const [refreshing, setRefreshing] = useState(false);
  const [senalesPendientesAbierto, setSenalesPendientesAbierto] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshPostVentaCache();
      refetch();
    } finally {
      setRefreshing(false);
    }
  }

  const tareasDeHoy = (tareas ?? []).filter(
    (t) => t.estado !== "CANCELADA" && esHoyOAntes(t.fechaVencimiento)
  );
  const tareasDeHoyCompletadas = tareasDeHoy.filter((t) => t.estado === "COMPLETADA").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Panel principal</h1>
          <div className="page-header-subtitle">
            ¿A quién hay que atender hoy y por qué?
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

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="kpi-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="card kpi-card" key={i}>
              <Skeleton height={12} width="60%" />
              <Skeleton height={28} width="40%" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          <section className="dashboard-section" aria-labelledby="dash-prioridades">
            <h2 id="dash-prioridades">Prioridades de hoy</h2>
            <ColaUrgentePanel alertas={alertasData?.data ?? null} loading={loadingAlertas} error={errorAlertas} />
            <div className="kpi-grid dashboard-kpi-grid-secundario">
              <KpiCard
                label="Alertas críticas"
                value={formatNumber(data.alertasPorNivel.CRITICAL)}
                tone={data.alertasPorNivel.CRITICAL > 0 ? "critical" : "success"}
                hint="Ver detalle en Alertas"
              />
              <KpiCard
                label="Renovaciones próximas"
                value={formatNumber(data.renovacionesProximas.count)}
                tone={data.renovacionesProximas.count > 0 ? "warning" : "success"}
                hint={`${formatCurrency(data.renovacionesProximas.monto)} en juego este ciclo`}
              />
            </div>
            <nav className="dashboard-quick-links" aria-label="Accesos directos a colas de trabajo">
              <Link className="btn btn-secondary" to="/alertas">
                Ver alertas
              </Link>
              <Link className="btn btn-secondary" to="/clientes">
                Ver cartera
              </Link>
              <Link className="btn btn-secondary" to="/tareas">
                Ver tareas
              </Link>
            </nav>
          </section>

          <section className="dashboard-section" aria-labelledby="dash-cobranza">
            <h2 id="dash-cobranza">Cobranza del mes</h2>
            <div className="kpi-grid">
              <KpiCard label="Total esperado del mes" value={formatCurrency(data.totalEsperadoMes)} />
              <KpiCard
                label="Estimado por recaudar hoy"
                value={formatCurrency(data.estimadoRecaudarHoy)}
              />
              <KpiCard
                label="Cobrado estimado (mes)"
                value={formatCurrency(data.totalCobradoMes)}
                tone="pending"
                hint="Pendiente de validación con negocio — no suma pagos registrados directamente (total − deuda por comprobante), no es la definición aprobada de 'Cobrado'"
              />
              <KpiCard
                label="Deuda total"
                value={formatCurrency(data.deudaTotal)}
                tone={data.deudaTotal > 0 ? "critical" : undefined}
                hint={`1 mes: ${formatCurrency(data.deudaPorAntiguedad.unMes)} · 2 meses: ${formatCurrency(
                  data.deudaPorAntiguedad.dosMeses
                )} · 3+ meses: ${formatCurrency(data.deudaPorAntiguedad.tresMasMeses)}`}
              />
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="dash-tareas">
            <h2 id="dash-tareas">Tareas y misiones de hoy</h2>
            {errorTareas && <p className="error-text">{errorTareas}</p>}
            <div className="kpi-grid">
              <KpiCard
                label="Progreso de hoy"
                value={loadingTareas ? "—" : `${tareasDeHoyCompletadas}/${tareasDeHoy.length}`}
                hint="Vencimiento hoy o antes, sin cancelar — ver detalle en Tareas"
              />
              <KpiCard
                label="Conversiones del día"
                value={loadingResultadosHoy ? "—" : formatNumber(conversionesHoy)}
                hint="Equipo + plan + módulo, todos los usuarios — ver detalle en Resultados"
              />
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="dash-cartera">
            <h2 id="dash-cartera">Cartera</h2>
            <div className="kpi-grid">
              <KpiCard label="Clientes" value={formatNumber(data.totalClientes)} />
              <KpiCard label="Órdenes de servicio" value={formatNumber(data.totalOs)} />
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
              <KpiCard label="Clientes con APILoyalty" value={formatNumber(data.clientesLoyalty)} />
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="dash-senales">
            <h2 id="dash-senales">Señales operativas</h2>
            <CollapsibleCard
              titulo="Métricas pendientes de definir fuente"
              subtitulo="No se calculan todavía — no hay un campo de origen confirmado para ninguna"
              abierto={senalesPendientesAbierto}
              onToggle={() => setSenalesPendientesAbierto((v) => !v)}
              contador={5}
              tone="pending"
            >
              <div className="kpi-grid">
                <KpiCard
                  label="Clientes Google"
                  value="—"
                  tone="pending"
                  hint="Fuente pendiente de validación — no existe un campo de origen para esto todavía"
                />
                <KpiCard
                  label="Clientes con Pago QR"
                  value="—"
                  tone="pending"
                  hint="Fuente pendiente de validación — no existe un campo de origen para esto todavía"
                />
                <KpiCard
                  label="Proyectado anual ya cobrado"
                  value="—"
                  tone="pending"
                  hint="Fuente pendiente de validación"
                />
                <KpiCard
                  label="Proyectado mensual ya cobrado"
                  value="—"
                  tone="pending"
                  hint="Fuente pendiente de validación"
                />
                <KpiCard
                  label="Proyectado semestral ya cobrado"
                  value="—"
                  tone="pending"
                  hint="Fuente pendiente de validación"
                />
              </div>
            </CollapsibleCard>
          </section>
        </>
      )}
    </div>
  );
}
