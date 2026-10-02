import type { BolsaEstado } from "../types/postventaCliente";

function horaLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

export interface ContenidoPopupBolsa {
  titulo: string;
  detalle: { label: string; valor: string | number }[];
  boton: string;
}

// Solo los dos casos pedidos explicitamente tienen algo que anunciar — una
// sesion CERRADA manualmente, o sin ninguna sesion todavia, no generan
// popup (nada nuevo/urgente que contar). Compartido entre el popup (que
// pinta esto) y el watcher (que decide si marcar "ya mostrado" — solo debe
// marcarse cuando de verdad hay algo que mostrar, para que un dia sin
// contenido no "gaste" el aviso de la sesion de navegador).
export function calcularContenidoPopupBolsa(estado: BolsaEstado): ContenidoPopupBolsa | null {
  const { sesion, resumen } = estado;
  if (!sesion) return null;

  if (sesion.estado === "ABIERTA") {
    const conversionesYLogros =
      resumen.oportunidadesGanadas.reduce((suma, o) => suma + o.cantidad, 0) + resumen.conversiones.length;
    return {
      titulo: "Tu Bolsa está abierta",
      detalle: [
        { label: "Hora de apertura", valor: horaLabel(sesion.abiertaEn) },
        { label: "Aperturas hoy", valor: sesion.numeroApertura },
        { label: "Clientes contactados", valor: resumen.contactos },
        { label: "Misiones completadas", valor: resumen.misionesCompletadas },
        { label: "Conversiones/logros registrados", valor: conversionesYLogros },
      ],
      boton: "Ver Bolsa",
    };
  }

  if (sesion.estado === "CERRADA" && sesion.origenCierre === "AUTOMATICA") {
    return {
      titulo: "Tu Bolsa fue cerrada automáticamente a las 19:00",
      detalle: [],
      boton: "Ver resumen",
    };
  }

  return null;
}
