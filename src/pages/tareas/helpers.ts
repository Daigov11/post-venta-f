import type { EstadoTarea, TareaListItem, TipoTarea } from "../../types/postventaCliente";

// Fecha LOCAL (no UTC): toISOString() devolvia el dia siguiente despues de
// las 19:00 en Lima.
export function hoyIso(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

export function esAbierta(t: { estado: EstadoTarea }): boolean {
  return t.estado !== "COMPLETADA" && t.estado !== "CANCELADA";
}

export function esVencida(t: { estado: EstadoTarea; fechaVencimiento: string | null }, hoy: string): boolean {
  return esAbierta(t) && t.fechaVencimiento !== null && t.fechaVencimiento < hoy;
}

// "Mision de hoy" = vence hoy, ya vencida, o sin fecha limite (sin fecha =
// nunca deja de ser parte del trabajo pendiente, no tiene sentido esperar a
// una fecha futura que no existe). No filtra por estado — se usa tanto para
// el progreso (incluye completadas) como, filtrando aparte por esAbierta,
// para la lista de trabajo real del dia.
export function esMisionDeHoy(t: { fechaVencimiento: string | null }, hoy: string): boolean {
  return t.fechaVencimiento === null || t.fechaVencimiento <= hoy;
}

export interface PrioridadIncidencia {
  prioritaria: boolean;
  // false = no se pudo determinar el estado real de la incidencia (nunca se
  // asume resuelta en ese caso) — ver Tareas.tsx, badge "Estado de
  // incidencia no disponible".
  disponible: boolean;
}

// null = la tarea no esta ligada a una incidencia, esta regla no aplica.
export function prioridadPorIncidencia(t: TareaListItem): PrioridadIncidencia | null {
  if (t.origenEntidadTipo !== "INCIDENCIA") return null;
  if (t.incidenciaAbierta === null) return { prioritaria: true, disponible: false };
  return { prioritaria: t.incidenciaAbierta, disponible: true };
}

// Suma dias corridos a una fecha (YYYY-MM-DD o vacio) y devuelve YYYY-MM-DD
// — mismo formato que ya acepta PATCH /api/tareas (fechaVencimiento).
export function postergarFecha(fechaActual: string | null, dias: number): string {
  const base = fechaActual ? new Date(fechaActual) : new Date();
  base.setDate(base.getDate() + dias);
  return base.toISOString().slice(0, 10);
}

// Orden de urgencia para "Misiones de hoy" (pedido explicito): incidencias
// abiertas primero, despues alertas criticas, despues cobranza vencida,
// despues cualquier otra vencida real, el resto (tareas del dia) al final.
// Un numero MAS CHICO = mas urgente. Se usa como criterio primario de
// ordenamiento, nunca como filtro (no oculta nada, solo decide el orden).
export function prioridadVistaDiaria(t: TareaListItem, hoy: string): number {
  if (t.origenEntidadTipo === "INCIDENCIA" && (prioridadPorIncidencia(t)?.prioritaria ?? true)) return 0;
  if (t.origen === "ALERTA" && t.prioridad === "ALTA") return 1;
  if (t.tipo === "COBRANZA" && esVencida(t, hoy)) return 2;
  if (esVencida(t, hoy)) return 3;
  return 4;
}

// Orden pensado para el filtro de tipo: los tipos de trabajo real primero,
// RENOVACION (casi siempre automatica) y PENDIENTE_CLASIFICACION (historial,
// ver migracion 0036) al final.
export const ORDEN_TIPOS: TipoTarea[] = [
  "COBRANZA",
  "SOPORTE",
  "DOCUMENTACION",
  "SEGUIMIENTO",
  "REUNION",
  "OPORTUNIDAD_COMERCIAL",
  "RENOVACION",
  "PENDIENTE_CLASIFICACION",
];
