import type { TipoBolsaConversion } from "../types/postventaCliente";

// Categorias fijas de conversion (ajuste post-primera-version: antes texto
// libre) — "OTRO" nunca se ofrece como opcion, solo existe para historial
// migrado que no calzaba con ninguna de las 6 categorias reales.
export const TIPO_BOLSA_CONVERSION_LABEL: Record<TipoBolsaConversion, string> = {
  CAMBIO_PERIODICIDAD: "Cambio de periodicidad",
  ADQUISICION_EQUIPO: "Adquisición de equipo",
  RECUPERACION_CLIENTE: "Recuperación de cliente",
  VENTA_PRODUCTO: "Venta de producto",
  APILOYALTY: "ApiLoyalty",
  APIREVIEW: "ApiReview",
  OTRO: "Otro (histórico)",
};

export const CATEGORIAS_CONVERSION_SELECCIONABLES: TipoBolsaConversion[] = [
  "CAMBIO_PERIODICIDAD",
  "ADQUISICION_EQUIPO",
  "RECUPERACION_CLIENTE",
  "VENTA_PRODUCTO",
  "APILOYALTY",
  "APIREVIEW",
];
