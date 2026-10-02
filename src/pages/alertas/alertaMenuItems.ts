import type { ActionMenuItem } from "../../components/ui/ActionMenu";
import type { Alerta } from "../../types/postventaCliente";
import { getAlertaMeta } from "../../utils/alertaLabels";
import { buildContactoMenuItems } from "../../utils/contactoMenuItems";

// Un solo lugar para armar los items del ⚙ de una alerta — usado tanto por
// la columna de la tabla desktop como por la tarjeta movil, para no duplicar
// la lista (y sus condiciones) en dos componentes distintos.
export function buildAlertaMenuItems(
  alerta: Alerta,
  handlers: {
    onAgendar: (alerta: Alerta) => void;
    onInvestigar: (alerta: Alerta) => void;
    onGenerarIncidencia: (alerta: Alerta) => void;
    onCrearTareaSeguimiento: (alerta: Alerta) => void;
    onMarcarVista: (alerta: Alerta) => void;
    onAbrirResolver: (alerta: Alerta) => void;
    onReabrir: (alerta: Alerta) => void;
  }
): ActionMenuItem[] {
  const meta = getAlertaMeta(alerta.tipo);
  const items: ActionMenuItem[] = [
    { key: "agendar", label: "Agendar / Interés", onSelect: () => handlers.onAgendar(alerta) },
    { key: "investigar", label: "Investigar caso", onSelect: () => handlers.onInvestigar(alerta) },
    { key: "ficha", label: "Abrir ficha", to: `/clientes/${alerta.cliente}` },
  ];

  if (meta.esIncidenciaOSunat) {
    items.push(
      ...buildContactoMenuItems({
        numeroDocumentoCliente: alerta.cliente,
        idOrdenServicio: alerta.idOrdenServicio,
        telefonoLimpio: alerta.telefonoEfectivo,
      })
    );
    items.push({
      key: "generar-incidencia",
      label: "Generar incidencia",
      onSelect: () => handlers.onGenerarIncidencia(alerta),
    });
  }

  items.push({ key: "crear-tarea", label: "Crear tarea", onSelect: () => handlers.onCrearTareaSeguimiento(alerta) });

  if (alerta.estado !== "RESUELTA") {
    if (alerta.estado !== "VISTA") {
      items.push({ key: "marcar-vista", label: "Marcar vista", onSelect: () => handlers.onMarcarVista(alerta) });
    }
    items.push({
      key: "marcar-resuelta",
      label: "Marcar resuelta",
      onSelect: () => handlers.onAbrirResolver(alerta),
    });
  } else {
    items.push({ key: "reabrir", label: "Reabrir", onSelect: () => handlers.onReabrir(alerta) });
  }

  return items;
}
