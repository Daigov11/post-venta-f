import { Badge } from "../../components/ui/Badge";
import { formatCurrency, formatNumber } from "../../utils/format";
import { TIPO_OPORTUNIDAD_LABEL } from "../../utils/oportunidadLabels";
import { TIPO_BOLSA_CONVERSION_LABEL } from "../../utils/bolsaLabels";
import type { BolsaResumen } from "../../types/postventaCliente";
import { ConversionesLista } from "./ConversionesForm";

// Bloque de numeros reutilizado tanto en el banner de "bolsa abierta" como
// en el modal de "notificación" al cerrar — mismos numeros, dos momentos.
export function ResumenBolsaNumeros({ resumen }: { resumen: BolsaResumen }) {
  const totalLogros =
    resumen.contactos +
    resumen.misionesCompletadas +
    resumen.oportunidadesGanadas.reduce((s, o) => s + o.cantidad, 0) +
    resumen.conversiones.length;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <Badge tone="success">{formatCurrency(resumen.totalSoles)}</Badge>
        <Badge tone="info">{formatNumber(resumen.contactos)} cliente(s) contactado(s)</Badge>
        <Badge tone="info">{formatNumber(resumen.misionesCompletadas)} misión(es) completada(s)</Badge>
        {resumen.oportunidadesGanadas.map((o) => (
          <Badge key={o.tipo} tone="neutral">
            {TIPO_OPORTUNIDAD_LABEL[o.tipo] ?? o.tipo}: {o.cantidad}
          </Badge>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        El monto es lo declarado en cada conversión, no una cifra de caja verificada.
      </p>
      <p className="muted" style={{ fontSize: 13 }}>
        {formatNumber(totalLogros)} logro(s) en total.
      </p>
      {resumen.conversiones.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <h4 style={{ fontSize: 13, marginBottom: 4 }}>Conversiones registradas a mano</h4>
          <ConversionesLista conversiones={resumen.conversiones} />
        </div>
      )}
    </div>
  );
}

// La "notificación" pedida al cerrar — no hay sistema de notificaciones
// push/toast persistente en la app (no existía nada reusable), así que esto
// se muestra como modal inmediato con los números reales que ya devuelve la
// respuesta del cierre.
export function ResumenCierreModal({
  resumen,
  onClose,
}: {
  resumen: BolsaResumen;
  onClose: () => void;
}) {
  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Bolsa cerrada — así te fue</h3>
        <ResumenBolsaNumeros resumen={resumen} />
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// Notificacion del dia anterior (pedido explicito) — debe poder cerrarse;
// el llamador (Bolsa.tsx) es quien decide, via localStorage, no volver a
// mostrarla el mismo dia despues de cerrada.
export function ResumenDiaAnteriorModal({
  resumen,
  onClose,
}: {
  resumen: {
    fecha: string;
    aperturas: number;
    cierres: number;
    clientesContactadosUnicos: number;
    misionesCompletadas: number;
    conversionesPorCategoria: { tipo: string; cantidad: number }[];
  };
  onClose: () => void;
}) {
  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Así te fue ayer ({resumen.fecha})</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <Badge tone="neutral">{formatNumber(resumen.aperturas)} apertura(s)</Badge>
          <Badge tone="neutral">{formatNumber(resumen.cierres)} cierre(s)</Badge>
          <Badge tone="info">{formatNumber(resumen.clientesContactadosUnicos)} cliente(s) contactado(s) único(s)</Badge>
          <Badge tone="info">{formatNumber(resumen.misionesCompletadas)} misión(es) completada(s)</Badge>
        </div>
        {resumen.conversionesPorCategoria.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <h4 style={{ fontSize: 13, marginBottom: 4 }}>Conversiones por categoría</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {resumen.conversionesPorCategoria.map((c) => (
                <Badge key={c.tipo} tone="neutral">
                  {TIPO_BOLSA_CONVERSION_LABEL[c.tipo as keyof typeof TIPO_BOLSA_CONVERSION_LABEL] ?? c.tipo}:{" "}
                  {c.cantidad}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
