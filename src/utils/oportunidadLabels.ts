import type { EstadoOportunidad } from "../types/postventaCliente";

export const ESTADO_OPORTUNIDAD_LABEL: Record<EstadoOportunidad, string> = {
  ABIERTA: "Abierta",
  EN_GESTION: "En gestión",
  GANADA: "Ganada",
  PERDIDA: "Perdida",
};

export const ESTADO_OPORTUNIDAD_TONE: Record<
  EstadoOportunidad,
  "neutral" | "info" | "success" | "critical"
> = {
  ABIERTA: "neutral",
  EN_GESTION: "info",
  GANADA: "success",
  PERDIDA: "critical",
};

// Catalogo real de oportunidades.engine.ts (backend) — usado por "La Bolsa"
// para mostrar por que tipo se ganó cada conversión. "SIN_TIPO" cubre
// registros viejos de antes de que existiera esta columna (ver migración
// 0041).
export const TIPO_OPORTUNIDAD_LABEL: Record<string, string> = {
  VENTA_EQUIPO: "Venta de equipo",
  MIGRACION_PERIODICIDAD: "Migración de periodicidad",
  CLIENTE_ANTIGUO: "Cliente antiguo",
  ALTO_VOLUMEN: "Alto volumen histórico",
  SIN_TIPO: "Sin tipo registrado",
};
