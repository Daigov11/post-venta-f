import type {
  EstadoOportunidad,
  EstadoPostVenta,
  EstadoTarea,
  NivelAlerta,
  OrigenTarea,
  PrioridadTarea,
  SegmentoCartera,
  TipoTarea,
} from "../../types/postventaCliente";
import { ESTADO_OPORTUNIDAD_LABEL, ESTADO_OPORTUNIDAD_TONE } from "../../utils/oportunidadLabels";
import {
  ESTADO_TAREA_LABEL,
  ESTADO_TAREA_TONE,
  ORIGEN_TAREA_LABEL,
  PRIORIDAD_TAREA_CONFIG,
  TIPO_TAREA_LABEL,
} from "../../utils/tareaLabels";
import { Badge } from "./Badge";

const ESTADO_CONFIG: Record<EstadoPostVenta, { tone: "success" | "warning" | "critical"; icon: string; label: string }> = {
  NORMAL: { tone: "success", icon: "🟢", label: "Normal" },
  REVISAR: { tone: "warning", icon: "🟡", label: "Revisar" },
  ATENCION: { tone: "critical", icon: "🔴", label: "Atención" },
};

export function EstadoPostVentaPill({
  estado,
  manual,
}: {
  estado: EstadoPostVenta;
  manual?: boolean;
}) {
  const config = ESTADO_CONFIG[estado];
  return (
    <Badge tone={config.tone}>
      {config.icon} {config.label}
      {manual ? " (manual)" : ""}
    </Badge>
  );
}

const NIVEL_CONFIG: Record<NivelAlerta, { tone: "info" | "warning" | "critical"; icon: string; label: string }> = {
  INFO: { tone: "info", icon: "ℹ️", label: "Info" },
  WARNING: { tone: "warning", icon: "⚠️", label: "Advertencia" },
  CRITICAL: { tone: "critical", icon: "🔴", label: "Crítico" },
};

export function NivelAlertaPill({ nivel }: { nivel: NivelAlerta }) {
  const config = NIVEL_CONFIG[nivel];
  return (
    <Badge tone={config.tone}>
      {config.icon} {config.label}
    </Badge>
  );
}

const SEGMENTO_CONFIG: Record<SegmentoCartera, { tone: "info" | "success" | "warning" | "critical"; icon: string; label: string }> = {
  DIAMANTE: { tone: "info", icon: "💎", label: "Diamante" },
  ORO: { tone: "success", icon: "🥇", label: "Oro" },
  PLATA: { tone: "warning", icon: "🥈", label: "Plata" },
  CRITICO: { tone: "critical", icon: "🔴", label: "Crítico" },
};

export function EstadoTareaPill({ estado }: { estado: EstadoTarea }) {
  return <Badge tone={ESTADO_TAREA_TONE[estado]}>{ESTADO_TAREA_LABEL[estado]}</Badge>;
}

export function PrioridadTareaPill({ prioridad }: { prioridad: PrioridadTarea }) {
  const config = PRIORIDAD_TAREA_CONFIG[prioridad];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

export function TipoTareaPill({ tipo }: { tipo: TipoTarea }) {
  return (
    <Badge tone={tipo === "PENDIENTE_CLASIFICACION" ? "pending" : "neutral"}>
      {TIPO_TAREA_LABEL[tipo]}
    </Badge>
  );
}

export function OrigenTareaBadge({ origen }: { origen: OrigenTarea }) {
  return <Badge tone="local">{ORIGEN_TAREA_LABEL[origen]}</Badge>;
}

export function EstadoOportunidadPill({ estado }: { estado: EstadoOportunidad }) {
  return <Badge tone={ESTADO_OPORTUNIDAD_TONE[estado]}>{ESTADO_OPORTUNIDAD_LABEL[estado]}</Badge>;
}

export function SegmentoPill({
  segmento,
  manual,
}: {
  segmento: SegmentoCartera | string | null;
  manual?: boolean;
}) {
  if (!segmento) {
    return <Badge tone="neutral">Sin evaluar</Badge>;
  }
  const config = SEGMENTO_CONFIG[segmento as SegmentoCartera];
  if (!config) {
    return (
      <Badge tone="neutral">
        {segmento}
        {manual ? " (manual)" : ""}
      </Badge>
    );
  }
  return (
    <Badge tone={config.tone}>
      {config.icon} {config.label}
      {manual ? " (manual)" : ""}
    </Badge>
  );
}
