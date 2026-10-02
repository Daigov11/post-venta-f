import { Badge } from "../../components/ui/Badge";
import type { ClaseCobranzaMes } from "./proyeccion";

export const CLASE_COBRANZA_LABEL: Record<ClaseCobranzaMes, string> = {
  pagado: "🟢 Pagado",
  vence_hoy: "🟠 Vence hoy",
  vencido_este_mes: "🔴 Vencido",
  proximo: "🔵 Próximo",
};

const CLASE_COBRANZA_TONE: Record<ClaseCobranzaMes, "success" | "warning" | "critical" | "neutral"> = {
  pagado: "success",
  vence_hoy: "warning",
  vencido_este_mes: "critical",
  proximo: "neutral",
};

// Texto + icono + color — nunca solo color, para no depender de percepcion
// de color.
export function ClaseCobranzaBadge({ clase }: { clase: ClaseCobranzaMes }) {
  return <Badge tone={CLASE_COBRANZA_TONE[clase]}>{CLASE_COBRANZA_LABEL[clase]}</Badge>;
}
