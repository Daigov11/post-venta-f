import type { EstadoTarea, OrigenTarea, PrioridadTarea, TipoTarea } from "../types/postventaCliente";

// Fuente unica de labels/tonos de Tarea — antes duplicado como ESTADO_LABEL/
// ESTADO_TONE en Tareas.tsx y ESTADO_TAREA_LABEL (solo label) en la ficha de
// cliente. Separado de StatusPill.tsx (que solo debe exportar componentes,
// para no romper Fast Refresh) pero consumido por sus pills.
// EN_PROCESO se reusa como "En seguimiento" en toda la UI (pedido
// explicito) — no es un estado nuevo en la base de datos, solo un label
// distinto para un valor que ya existia sin usarse en ningun filtro.
export const ESTADO_TAREA_LABEL: Record<EstadoTarea, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En seguimiento",
  ESPERANDO_CLIENTE: "Esperando cliente",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

export const ESTADO_TAREA_TONE: Record<
  EstadoTarea,
  "neutral" | "info" | "warning" | "success" | "critical"
> = {
  PENDIENTE: "neutral",
  EN_PROCESO: "info",
  ESPERANDO_CLIENTE: "warning",
  COMPLETADA: "success",
  CANCELADA: "critical",
};

// "Prioridad visible con texto + icono + color" (Handoff Postventa) — antes
// se mostraba como texto plano en la tabla de Tareas.
export const PRIORIDAD_TAREA_CONFIG: Record<
  PrioridadTarea,
  { tone: "critical" | "warning" | "neutral"; label: string }
> = {
  ALTA: { tone: "critical", label: "🔴 Alta" },
  MEDIA: { tone: "warning", label: "🟡 Media" },
  BAJA: { tone: "neutral", label: "⚪ Baja" },
};

// Naturaleza de la tarea (que trabajo es) — separado de ORIGEN_TAREA_LABEL
// (como se creo). Ver migracion 0036 para el porque de
// PENDIENTE_CLASIFICACION.
export const TIPO_TAREA_LABEL: Record<TipoTarea, string> = {
  RENOVACION: "Renovación",
  PENDIENTE_CLASIFICACION: "Pendiente de clasificación",
  COBRANZA: "Cobranza",
  DOCUMENTACION: "Documentación",
  SOPORTE: "Soporte",
  SEGUIMIENTO: "Seguimiento",
  REUNION: "Reunión",
  OPORTUNIDAD_COMERCIAL: "Oportunidad comercial",
};

export const ORIGEN_TAREA_LABEL: Record<OrigenTarea, string> = {
  MANUAL: "Manual",
  ALERTA: "Alerta",
  INCIDENCIA: "Incidencia",
  FICHA_CLIENTE: "Ficha de cliente",
  OPORTUNIDAD: "Oportunidad",
  RENOVACION: "Renovación",
  REPARTO_MENSUAL: "Reparto mensual",
  RECUPERACION: "Recuperación",
};
