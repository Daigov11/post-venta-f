import type { TipoConversion } from "../types/postventaCliente";

// Los 3 tipos vienen confirmados del brief de Fase 3 — no es un catalogo
// abierto (a diferencia de "tipo" en acciones, que es texto libre).
export const TIPO_CONVERSION_LABEL: Record<TipoConversion, string> = {
  EQUIPO: "Adquisición de equipo",
  PLAN: "Cambio de plan",
  MODULO: "Adquisición de módulo",
};

export const TIPOS_CONVERSION: TipoConversion[] = ["EQUIPO", "PLAN", "MODULO"];
