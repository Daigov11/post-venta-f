import type { TipoAccionOperativa } from "../types/postventaCliente";

// Catalogo cerrado — mismo enum que valida el backend (ver
// backend/src/types/postventa.ts#TipoAccionOperativa). Si se agrega un tipo
// nuevo hay que sumarlo aca tambien.
export const TIPO_ACCION_LABEL: Record<TipoAccionOperativa, string> = {
  CONTACTO_LLAMADA: "Llamada",
  CONTACTO_WHATSAPP: "WhatsApp",
  TAREA_CREADA: "Tarea creada",
  TAREA_COMPLETADA: "Tarea completada",
  TAREA_POSTERGADA: "Tarea postergada",
  TAREA_REASIGNADA: "Tarea reasignada",
  ALERTA_RESUELTA: "Alerta resuelta",
  INCIDENCIA_CREADA: "Incidencia creada",
  SEGUIMIENTO_REGISTRADO: "Seguimiento registrado",
  OPORTUNIDAD_GESTIONADA: "Oportunidad gestionada",
  CONVERSION_REGISTRADA: "Conversión registrada",
  DIA_ABIERTO: "Día abierto",
  DIA_CERRADO: "Día cerrado",
};

export function tipoAccionLabel(tipo: string): string {
  return TIPO_ACCION_LABEL[tipo as TipoAccionOperativa] ?? tipo;
}
