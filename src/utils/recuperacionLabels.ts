import type { BadgeTone } from "../components/ui/Badge";
import type { EstadoRecuperacion, OrigenRecuperacion } from "../types/postventaCliente";

export const ORIGEN_RECUPERACION_LABEL: Record<OrigenRecuperacion, string> = {
  RENOVACION_IMPAGA: "Renovación impaga",
  SUSPENSION: "Suspensión",
  BAJA: "Baja",
};

export const ORIGEN_RECUPERACION_TONE: Record<OrigenRecuperacion, BadgeTone> = {
  RENOVACION_IMPAGA: "info",
  SUSPENSION: "warning",
  BAJA: "critical",
};

export const ESTADO_RECUPERACION_LABEL: Record<EstadoRecuperacion, string> = {
  EN_RECUPERACION: "En recuperación",
  RECUPERADO: "Recuperado",
  PERDIDO: "Perdido",
  PENDIENTE_VALIDACION: "Pendiente de validación",
};

export const ESTADO_RECUPERACION_TONE: Record<EstadoRecuperacion, BadgeTone> = {
  EN_RECUPERACION: "warning",
  RECUPERADO: "success",
  PERDIDO: "critical",
  PENDIENTE_VALIDACION: "pending",
};
