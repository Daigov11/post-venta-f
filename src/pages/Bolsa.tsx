import { useEffect, useState } from "react";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useBolsa } from "../hooks/useBolsa";
import { cerrarBolsa, reabrirBolsa } from "../services/bolsa";
import type { BolsaResumen, BolsaResumenDiaAnterior } from "../types/postventaCliente";
import { ConversionesForm } from "./bolsa/ConversionesForm";
import { CerrarBolsaDialog } from "./bolsa/CerrarBolsaDialog";
import { EstadoBolsaActual } from "./bolsa/EstadoBolsaActual";
import { MisAccionesHoy } from "./bolsa/MisAccionesHoy";
import { ResumenCierreModal, ResumenDiaAnteriorModal } from "./bolsa/ResumenBolsa";

// Debe poder cerrarse y no volver a aparecer el mismo dia (pedido
// explicito) — se guarda solo del lado del navegador, nunca se le pide al
// backend "marcar como vista": es un dato de conveniencia por dispositivo,
// no un estado que otra pantalla necesite leer.
function claveDismissDiaAnterior(usuario: string, resumen: BolsaResumenDiaAnterior): string {
  return `bolsa_resumen_ayer_visto_${usuario}_${resumen.fecha}`;
}

function yaSeVioResumenDeAyer(usuario: string, resumen: BolsaResumenDiaAnterior): boolean {
  try {
    return localStorage.getItem(claveDismissDiaAnterior(usuario, resumen)) === "1";
  } catch {
    return false;
  }
}

function marcarResumenDeAyerVisto(usuario: string, resumen: BolsaResumenDiaAnterior): void {
  try {
    localStorage.setItem(claveDismissDiaAnterior(usuario, resumen), "1");
  } catch {
    // Si el navegador bloquea localStorage (modo privado, etc.), no pasa
    // nada grave — el resumen podria volver a aparecer, no es un dato critico.
  }
}

export function BolsaPage() {
  const { username } = useAuth();
  const [refreshToken, setRefreshToken] = useState(0);
  const { data, loading, error, refetch } = useBolsa(refreshToken);
  const [cierreDialogOpen, setCierreDialogOpen] = useState(false);
  const [resumenCierre, setResumenCierre] = useState<BolsaResumen | null>(null);
  const [resumenAyerVisible, setResumenAyerVisible] = useState<BolsaResumenDiaAnterior | null>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!data?.resumenDiaAnterior || !username) return;
    if (yaSeVioResumenDeAyer(username, data.resumenDiaAnterior)) return;
    setResumenAyerVisible(data.resumenDiaAnterior);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a que llegue un resumenDiaAnterior nuevo, no a cada render
  }, [data?.resumenDiaAnterior]);

  function cerrarResumenAyer() {
    if (resumenAyerVisible && username) marcarResumenDeAyerVisto(username, resumenAyerVisible);
    setResumenAyerVisible(null);
  }

  async function handleCerrar(observacion: string | null) {
    setProcesando(true);
    try {
      const estado = await cerrarBolsa(observacion);
      setCierreDialogOpen(false);
      setResumenCierre(estado.resumen);
      refetch();
      setRefreshToken((t) => t + 1);
    } finally {
      setProcesando(false);
    }
  }

  async function handleReabrir() {
    setProcesando(true);
    try {
      await reabrirBolsa();
      refetch();
      setRefreshToken((t) => t + 1);
    } finally {
      setProcesando(false);
    }
  }

  function handleConversionRegistrada() {
    refetch();
    setRefreshToken((t) => t + 1);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>La Bolsa</h1>
          <div className="page-header-subtitle">
            Abre sola a las 8:30am en S/0 y cierra sola a las 7:00pm (hora Perú) — se puede abrir y
            cerrar más veces durante el día. Los montos y logros se calculan en vivo sobre datos
            reales, nunca inventados; los montos son declarados, no caja verificada.
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      {loading && !data && <Skeleton height={160} />}

      {data && (
        <EstadoBolsaActual
          estado={data}
          onCerrar={() => setCierreDialogOpen(true)}
          onReabrir={handleReabrir}
          procesando={procesando}
        />
      )}

      {data?.sesion?.estado === "ABIERTA" && (
        <section className="card ficha-section ficha-full-width" style={{ marginTop: "var(--space-4)" }}>
          <h3 style={{ marginTop: 0 }}>Registrar una conversión</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            Cambio de periodicidad y adquisición de equipo ya se cuentan solos al marcar la
            oportunidad como "Ganada" — usa esto para esas mismas categorías si preferís dejarlo
            aparte, o para recuperación de cliente, venta de producto, ApiLoyalty y ApiReview, que no
            tienen ningún campo automático todavía.
          </p>
          <ConversionesForm onRegistrada={handleConversionRegistrada} />
        </section>
      )}

      <div style={{ marginTop: "var(--space-6)" }}>
        <MisAccionesHoy refreshToken={refreshToken} />
      </div>

      {cierreDialogOpen && (
        <CerrarBolsaDialog
          onClose={() => setCierreDialogOpen(false)}
          onConfirm={handleCerrar}
          submitting={procesando}
        />
      )}

      {resumenCierre && (
        <ResumenCierreModal resumen={resumenCierre} onClose={() => setResumenCierre(null)} />
      )}

      {resumenAyerVisible && (
        <ResumenDiaAnteriorModal resumen={resumenAyerVisible} onClose={cerrarResumenAyer} />
      )}
    </div>
  );
}
