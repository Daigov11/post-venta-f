import { ActionMenu, type ActionMenuItem } from "../../components/ui/ActionMenu";
import { Badge } from "../../components/ui/Badge";
import { NivelAlertaPill } from "../../components/ui/StatusPill";
import type { Alerta } from "../../types/postventaCliente";
import { ESTADO_ALERTA_LABEL, ESTADO_ALERTA_TONE, tipoAlertaLabel } from "../../utils/alertaLabels";

// Vista movil: una sola tarjeta compacta por alerta, con el ⚙ arriba a la
// izquierda junto al nombre del cliente (mismo arreglo de items que la
// columna desktop, armado una sola vez en Alertas.tsx). La tarjeta ya NO es
// clicable completa — "no usar filas completas clicables para abrir
// acciones" — solo el boton ⚙ es accionable.
export function AlertaMiniCard({ alerta, items }: { alerta: Alerta; items: ActionMenuItem[] }) {
  return (
    <article className="alerta-mini-card">
      <div className="alerta-mini-card-top">
        <ActionMenu label={`Acciones para ${alerta.nombreCliente}`} items={items} />
        <div className="alerta-mini-card-cliente-info">
          <div className="alerta-mini-card-cliente">{alerta.nombreCliente}</div>
          <div className="alerta-mini-card-ruc">{alerta.cliente}</div>
        </div>
        <div className="alerta-mini-card-badges">
          <NivelAlertaPill nivel={alerta.nivel} />
          <Badge tone={ESTADO_ALERTA_TONE[alerta.estado]}>{ESTADO_ALERTA_LABEL[alerta.estado]}</Badge>
        </div>
      </div>
      <div className="alerta-mini-card-tipo">{tipoAlertaLabel(alerta.tipo)}</div>
      <p className="alerta-mini-card-mensaje">{alerta.mensaje}</p>
    </article>
  );
}
