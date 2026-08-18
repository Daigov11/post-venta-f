import type { EstadoPostVenta, NivelAlerta, SegmentoCartera } from "../../types/postventaCliente";
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
