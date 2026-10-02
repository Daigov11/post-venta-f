import { Badge } from "../../components/ui/Badge";
import type { BolsaEstado } from "../../types/postventaCliente";
import { ResumenBolsaNumeros } from "./ResumenBolsa";

function horaLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

export function EstadoBolsaActual({
  estado,
  onCerrar,
  onReabrir,
  procesando,
}: {
  estado: BolsaEstado;
  onCerrar: () => void;
  onReabrir: () => void;
  procesando: boolean;
}) {
  const { sesion, resumen } = estado;

  if (!sesion) {
    return (
      <section className="card ficha-section ficha-full-width">
        <h2>La Bolsa</h2>
        <p className="muted">
          Abre sola de 8:30am a 7:00pm (hora Perú) — todavía no hay ninguna sesión hoy porque estás
          fuera de ese horario.
        </p>
      </section>
    );
  }

  return (
    <section className="card ficha-section ficha-full-width">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>
            {sesion.estado === "ABIERTA" ? "Bolsa abierta" : "Bolsa cerrada"}
            {sesion.numeroApertura > 1 && ` (apertura #${sesion.numeroApertura} de hoy)`}
          </h2>
          <p className="muted" style={{ margin: "4px 0 0 0" }}>
            Desde las {horaLabel(sesion.abiertaEn)}
            {sesion.cerradaEn && ` hasta las ${horaLabel(sesion.cerradaEn)}`} ·{" "}
            <Badge tone={sesion.origenApertura === "AUTOMATICA" ? "neutral" : "info"}>
              {sesion.origenApertura === "AUTOMATICA" ? "apertura automática" : "apertura manual"}
            </Badge>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {sesion.estado === "ABIERTA" && (
            <button type="button" className="btn btn-primary" disabled={procesando} onClick={onCerrar}>
              {procesando ? "..." : "Cerrar bolsa"}
            </button>
          )}
          {sesion.estado === "CERRADA" && (
            <button type="button" className="btn btn-secondary" disabled={procesando} onClick={onReabrir}>
              {procesando ? "..." : "Reabrir bolsa"}
            </button>
          )}
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <ResumenBolsaNumeros resumen={resumen} />
      </div>
    </section>
  );
}
