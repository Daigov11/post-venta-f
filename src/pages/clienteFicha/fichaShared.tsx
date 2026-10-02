import type { ReactNode } from "react";
import { Badge } from "../../components/ui/Badge";

// Distingue visualmente datos que vienen de APIWorking (fuente externa, solo
// lectura) de trabajo propio de la plataforma — ver Especificaciones
// Postventa v2 / Handoff Postventa. Icono + texto siempre, nunca solo color.
export function SourceTag({ origen }: { origen: "apiworking" | "local" }) {
  return origen === "apiworking" ? (
    <Badge tone="info">🌐 APIWorking</Badge>
  ) : (
    <Badge tone="local">🗂️ Plataforma local</Badge>
  );
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );
}

// El historial de seguimiento trae ~30 nestado distintos, propios del motor
// de estados interno de APIWorking — no tenemos un catalogo confiable de que
// significa cada uno. Solo se colorean los 2 que ya usamos en otro lado de la
// app con ese mismo significado (esProblema en Renovaciones usa literalmente
// "SUSPENDIDO POR PAGO"); el resto queda neutral en vez de inventar semántica.
export function HistorialEstadoBadge({ estado }: { estado: string }) {
  if (estado === "SUSPENDIDO POR PAGO") return <Badge tone="critical">{estado}</Badge>;
  if (estado === "COBRANZA") return <Badge tone="success">{estado}</Badge>;
  return <Badge tone="neutral">{estado || "Sin estado"}</Badge>;
}

export function IncidenciaEstadoBadge({ resuelta }: { resuelta: boolean }) {
  return resuelta ? <Badge tone="success">Resuelta</Badge> : <Badge tone="warning">Abierta</Badge>;
}
