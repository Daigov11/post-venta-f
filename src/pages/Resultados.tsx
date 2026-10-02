import { useState } from "react";
import { Skeleton } from "../components/ui/Skeleton";
import { useResultadoHoy } from "../hooks/useResultadoHoy";
import { useResumenEventosHoy } from "../hooks/useResumenEventosHoy";
import { abrirDia, cerrarDia } from "../services/resultadoDia";
import { AccionesAutomaticasResumen } from "./resultados/AccionesAutomaticasResumen";
import { AccionesEditor } from "./resultados/AccionesEditor";
import { AperturaForm } from "./resultados/AperturaForm";
import { CierreDialog } from "./resultados/CierreDialog";
import { ConversionesEditor } from "./resultados/ConversionesEditor";
import { HistoricoResultados } from "./resultados/HistoricoResultados";
import { ResumenDia } from "./resultados/ResumenDia";
import "./Resultados.css";

export function ResultadosPage() {
  const { data, loading, error, refetch } = useResultadoHoy();
  const [abriendo, setAbriendo] = useState(false);
  const [cierreDialogOpen, setCierreDialogOpen] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  // El historico vive en su propio componente/hook (con sus propios filtros
  // de fecha/usuario) — este contador es la unica forma de avisarle "algo
  // cambio" sin forzar un remount que le resetee los filtros. El resumen de
  // eventos automaticos de hoy reutiliza el mismo contador: tambien deberia
  // refrescarse cuando se abre/cierra el dia o se registra una accion.
  const [historicoRefreshToken, setHistoricoRefreshToken] = useState(0);
  const resumenEventosHoy = useResumenEventosHoy(historicoRefreshToken);

  async function handleAbrir(montoApertura: number) {
    setAbriendo(true);
    try {
      await abrirDia(montoApertura);
      refetch();
      setHistoricoRefreshToken((t) => t + 1);
    } finally {
      setAbriendo(false);
    }
  }

  async function handleCerrar(input: {
    observacionCierre: string | null;
    avisoAdministracion: boolean;
    motivoAviso: string | null;
  }) {
    if (!data?.resultado) return;
    setCerrando(true);
    try {
      await cerrarDia(data.resultado.id, input);
      setCierreDialogOpen(false);
      refetch();
      setHistoricoRefreshToken((t) => t + 1);
    } finally {
      setCerrando(false);
    }
  }

  function handleAccionOConversionCambiada() {
    refetch();
    setHistoricoRefreshToken((t) => t + 1);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Resultados y cierre diario</h1>
          <div className="page-header-subtitle">
            Apertura, acciones, conversiones y cierre del día — 100% interno, sin datos de
            APIWorking. No hay fórmula de cuadre ni monto de cierre: el resultado es lo que se
            registra explícitamente.
          </div>
        </div>
      </div>

      {/* Estado: error */}
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      <AccionesAutomaticasResumen
        titulo="Acciones automáticas registradas hoy"
        resumen={resumenEventosHoy.data}
        loading={resumenEventosHoy.loading}
        error={resumenEventosHoy.error}
        onRetry={resumenEventosHoy.refetch}
      />

      {/* Estado: carga */}
      {loading && !data && <Skeleton height={160} />}

      {!loading && data && !data.resultado && (
        <AperturaForm fecha={data.fecha} onAbrir={handleAbrir} submitting={abriendo} />
      )}

      {!loading && data?.resultado && data.resultado.estado === "ABIERTO" && (
        <div className="ficha-grid">
          <section className="card ficha-section ficha-full-width">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Día en progreso — {data.resultado.fecha}</h2>
                <p className="muted" style={{ margin: "4px 0 0 0" }}>
                  Apertura: S/ {data.resultado.montoApertura.toFixed(2)} ·{" "}
                  {new Date(data.resultado.horaApertura).toLocaleTimeString("es-PE")}
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setCierreDialogOpen(true)}>
                Cerrar día
              </button>
            </div>
          </section>

          <AccionesEditor
            resultadoDiaId={data.resultado.id}
            acciones={data.resultado.acciones}
            onChanged={handleAccionOConversionCambiada}
          />

          <ConversionesEditor
            resultadoDiaId={data.resultado.id}
            conversiones={data.resultado.conversiones}
            onChanged={handleAccionOConversionCambiada}
          />
        </div>
      )}

      {!loading && data?.resultado && data.resultado.estado === "CERRADO" && (
        <ResumenDia resultado={data.resultado} />
      )}

      {cierreDialogOpen && (
        <CierreDialog
          onClose={() => setCierreDialogOpen(false)}
          onConfirm={handleCerrar}
          submitting={cerrando}
        />
      )}

      <div style={{ marginTop: "var(--space-6)" }}>
        <HistoricoResultados refreshToken={historicoRefreshToken} />
      </div>
    </div>
  );
}
