// Metadata de negocio por tipo de alerta — deliberadamente explicita y
// server-verificada (los tipos vienen del motor de reglas, ver
// backend/src/engines/alertas.engine.ts), no inventada por la UI. Si aparece
// un tipo nuevo que no esta en este mapa, se usa el fallback "Pendiente de
// validación" en vez de adivinar (ver ALERTA_META_DEFAULT).

export type AreaSugerida = "Postventa" | "Soporte" | "Administración" | "Cobranzas";

export interface AlertaMeta {
  area: AreaSugerida | null;
  accionRecomendada: string;
  porQue: string;
  // Habilita las acciones especificas de incidencia/SUNAT (investigar caso,
  // crear tarea de soporte, registrar contacto, escalar) segun el ajuste
  // funcional de Fase 3.
  esIncidenciaOSunat: boolean;
}

const ALERTA_META_DEFAULT: AlertaMeta = {
  area: null,
  accionRecomendada: "Motivo pendiente de validación",
  porQue: "Motivo pendiente de validación",
  esIncidenciaOSunat: false,
};

// Mismos 10 tipos que emite alertaRules + REUNION_PROXIMA (agregada aparte
// en el controller) — ver TIPOS_ALERTA en Alertas.tsx, misma lista.
export const ALERTA_META: Record<string, AlertaMeta> = {
  DEUDA_PENDIENTE: {
    area: "Cobranzas",
    accionRecomendada: "Contactar al cliente para regularizar el pago pendiente.",
    porQue: "Se genera cuando la deuda total supera el mínimo configurado y no ha superado el máximo de días de atraso permitido.",
    esIncidenciaOSunat: false,
  },
  ALTA_PENDIENTE: {
    area: "Soporte",
    accionRecomendada: "Verificar el estado del alta en APIWorking y resolver la incidencia pendiente.",
    porQue: "El cliente tiene una incidencia \"Dar de alta al cliente\" abierta en APIWorking sin resolver.",
    esIncidenciaOSunat: true,
  },
  CERTIFICADO_VENCE_HOY: {
    area: "Administración",
    accionRecomendada: "Renovar el certificado digital SUNAT de inmediato — riesgo de no poder emitir comprobantes hoy.",
    porQue: "El certificado digital SUNAT del cliente vence en la fecha de hoy.",
    esIncidenciaOSunat: true,
  },
  CERTIFICADO_POR_VENCER: {
    area: "Administración",
    accionRecomendada: "Coordinar la renovación del certificado digital SUNAT antes del vencimiento.",
    porQue: "El certificado digital SUNAT del cliente está próximo a vencer.",
    esIncidenciaOSunat: true,
  },
  SIN_EQUIPO: {
    area: "Postventa",
    accionRecomendada: "Coordinar la entrega o asignación del equipo pendiente.",
    porQue: "La orden de servicio vigente del cliente no tiene un equipo asociado.",
    esIncidenciaOSunat: false,
  },
  DOCUMENTACION_INCOMPLETA: {
    area: "Administración",
    accionRecomendada: "Solicitar al cliente la documentación faltante.",
    porQue: "El porcentaje de documentación disponible está por debajo del mínimo configurado.",
    esIncidenciaOSunat: false,
  },
  SIN_COMPROBANTES: {
    area: "Administración",
    accionRecomendada: "Revisar por qué no se han emitido comprobantes pese a que el cliente es facturable.",
    porQue: "El cliente es facturable pero no registra comprobantes históricos emitidos.",
    esIncidenciaOSunat: false,
  },
  ANIVERSARIO: {
    area: "Postventa",
    accionRecomendada: "Considerar un gesto de fidelización por aniversario.",
    porQue: "El cliente cumple un múltiplo del ciclo de aniversario configurado.",
    esIncidenciaOSunat: false,
  },
  RENOVACION_PROXIMA: {
    area: "Cobranzas",
    accionRecomendada: "Contactar al cliente antes del vencimiento del ciclo de pago.",
    porQue: "Faltan pocos días para el próximo vencimiento de pago según la periodicidad del plan.",
    esIncidenciaOSunat: false,
  },
  SIN_ACTIVIDAD_RECIENTE: {
    area: "Postventa",
    accionRecomendada: "Contactar al cliente para entender por qué dejó de ingresar al sistema.",
    porQue: "El cliente no ingresa a su sistema hace varios días pese a que su segmento de pago está al día.",
    esIncidenciaOSunat: false,
  },
  REUNION_PROXIMA: {
    area: "Postventa",
    accionRecomendada: "Confirmar la reunión programada con el cliente.",
    porQue: "Hay una reunión programada para hoy o mañana con este cliente.",
    esIncidenciaOSunat: false,
  },
};

export function getAlertaMeta(tipo: string): AlertaMeta {
  return ALERTA_META[tipo] ?? ALERTA_META_DEFAULT;
}

// Mismos tipos que emite el motor de alertas (ver alertaRules en
// backend/src/engines/alertas.engine.ts) + REUNION_PROXIMA, que se agrega
// aparte en el controller. Si se agrega una regla nueva hay que sumarla aca
// tambien — no hay un endpoint que liste los tipos posibles. Fuente unica
// para el filtro de /alertas y para el resumen compacto en la ficha del
// cliente (antes duplicado en Alertas.tsx).
export const TIPO_ALERTA_LABEL: Record<string, string> = {
  DEUDA_PENDIENTE: "Deuda pendiente",
  ALTA_PENDIENTE: "Alta pendiente",
  CERTIFICADO_VENCE_HOY: "Certificado vence hoy",
  CERTIFICADO_POR_VENCER: "Certificado por vencer",
  SIN_EQUIPO: "Cliente sin equipo",
  DOCUMENTACION_INCOMPLETA: "Documentación incompleta",
  SIN_COMPROBANTES: "Sin comprobantes emitidos",
  ANIVERSARIO: "Aniversario de antigüedad",
  RENOVACION_PROXIMA: "Renovación próxima",
  SIN_ACTIVIDAD_RECIENTE: "Sin actividad reciente",
  REUNION_PROXIMA: "Reunión próxima",
};

export const TIPOS_ALERTA: { value: string; label: string }[] = Object.entries(TIPO_ALERTA_LABEL).map(
  ([value, label]) => ({ value, label })
);

export function tipoAlertaLabel(tipo: string): string {
  return TIPO_ALERTA_LABEL[tipo] ?? tipo;
}

// EstadoAlerta importado como string literal (no como tipo) para no crear un
// ciclo de imports con types/postventaCliente — son los mismos 3 valores que
// ese tipo declara.
export const ESTADO_ALERTA_LABEL: Record<string, string> = {
  ABIERTA: "Activa",
  VISTA: "Vista",
  RESUELTA: "Resuelta",
};

export const ESTADO_ALERTA_TONE: Record<string, "neutral" | "info" | "success"> = {
  ABIERTA: "neutral",
  VISTA: "info",
  RESUELTA: "success",
};
