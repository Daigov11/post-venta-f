import { ActionMenu, type ActionMenuItem } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { ClienteCell } from "../components/ui/ClienteCell";
import type { ColumnOption } from "../components/ui/ColumnCustomizer";
import type { DataTableColumn } from "../components/ui/DataTable";
import { EstadoPostVentaPill, SegmentoPill } from "../components/ui/StatusPill";
import type { PostVentaCliente } from "../types/postventaCliente";
import { buildContactoMenuItems } from "../utils/contactoMenuItems";
import { formatCurrency, formatNumber } from "../utils/format";

export const SORT_FIELD_BY_COLUMN: Record<string, string> = {
  estado: "estadoPostVentaEfectivo",
  cliente: "nombreCliente",
  antiguedad: "antiguedadMeses",
  comprobantes: "cantidadComprobantesHistorico",
  deuda: "deudaTotal",
  renovacion: "diasParaRenovacion",
  ingresosMensuales: "ingresosClienteMensual",
  actividad: "diasSinActividad",
};

// Antes era un array estatico — pasa a funcion porque la columna
// "oportunidad" necesita el set de clientes con oportunidad activa
// (viene de otro fetch, useOportunidades, no de PostVentaCliente).
export function buildAllColumns(
  clientesConOportunidad: Set<string>
): DataTableColumn<PostVentaCliente>[] {
  return [
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (c) => (
        <EstadoPostVentaPill estado={c.estadoPostVentaEfectivo} manual={!!c.estadoPostVentaManual} />
      ),
    },
    {
      key: "segmento",
      label: "Segmento",
      render: (c) => <SegmentoPill segmento={c.segmentoEfectivo} manual={!!c.segmentoManual} />,
    },
    {
      key: "cliente",
      label: "Cliente",
      sortable: true,
      render: (c) => (
        <ClienteCell
          numeroDocumentoCliente={c.numeroDocumentoCliente}
          nombreCliente={c.nombreCliente}
          sistemas={c.sistemas}
        />
      ),
    },
    {
      // Llamar/WhatsApp se movieron al menu ⚙ (columna "acciones") — el
      // numero en si sigue visible aca como texto, es informacion, no accion.
      key: "telefono",
      label: "Teléfono",
      render: (c) => {
        if (!c.telefonoEfectivo) return <span className="muted">—</span>;
        return <span>{c.telefonoEfectivo}</span>;
      },
    },
    {
      key: "os",
      label: "OS",
      render: (c) => c.ordenVigente.numeroOs + (c.cantidadOs > 1 ? ` (+${c.cantidadOs - 1})` : ""),
    },
    {
      key: "rubro",
      label: "Rubro",
      render: (c) => c.rubro,
    },
    {
      key: "nombreComercial",
      label: "Nombre comercial",
      render: (c) => c.ordenVigente.postVentaExtra?.nombreComercial ?? "—",
    },
    {
      key: "ingresosMensuales",
      label: "Ingresos mensuales",
      align: "right",
      sortable: true,
      render: (c) =>
        c.ordenVigente.postVentaExtra?.ingresosClienteMensual == null
          ? "—"
          : formatCurrency(c.ordenVigente.postVentaExtra.ingresosClienteMensual),
    },
    {
      key: "suspendido",
      label: "Suspendido",
      align: "center",
      render: (c) =>
        c.ordenVigente.postVentaExtra === null ? (
          <span className="muted">—</span>
        ) : c.ordenVigente.postVentaExtra.suspendido ? (
          <Badge tone="critical">Sí</Badge>
        ) : (
          <Badge tone="success">No</Badge>
        ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (c) => c.planActual.nombre,
    },
    {
      key: "periodicidad",
      label: "Periodicidad",
      render: (c) => c.planActual.periodicidad,
    },
    {
      key: "estadoApiWorking",
      label: "Estado APIWorking",
      render: (c) => c.ordenVigente.nEstadoApiWorking,
    },
    {
      key: "antiguedad",
      label: "Antigüedad",
      sortable: true,
      render: (c) => c.antiguedad.texto,
    },
    {
      key: "comprobantes",
      label: "Comprobantes",
      sortable: true,
      align: "right",
      render: (c) => formatNumber(c.cantidadComprobantesHistorico),
    },
    {
      key: "trabajadores",
      label: "N° Trabajadores",
      align: "right",
      render: (c) =>
        c.cantidadTrabajadores === null ? (
          <span className="muted">Sin datos</span>
        ) : (
          formatNumber(c.cantidadTrabajadores)
        ),
    },
    {
      key: "equipo",
      label: "Equipo",
      align: "center",
      render: (c) =>
        c.ordenVigente.existeEquipo ? (
          <Badge tone="success">Sí</Badge>
        ) : (
          <Badge tone="neutral">No</Badge>
        ),
    },
    {
      key: "deuda",
      label: "Deuda / días vencidos",
      sortable: true,
      align: "right",
      render: (c) => (
        <div className="cell-stack-end">
          <span
            style={c.deudaTotal > 0 ? { color: "var(--color-critical)", fontWeight: 600 } : undefined}
          >
            {formatCurrency(c.deudaTotal)}
          </span>
          {c.deudaTotal > 0 && c.diasVencido !== null && (
            <Badge tone="critical">{c.diasVencido} día(s) vencido</Badge>
          )}
        </div>
      ),
    },
    {
      key: "ejecutivo",
      label: "Ejecutivo",
      render: (c) => c.ordenVigente.ejecutivo ?? "—",
    },
    {
      key: "ubicacion",
      label: "Ubicación",
      render: (c) =>
        c.ubicacion && "departamento" in c.ubicacion
          ? `${c.ubicacion.departamento} / ${c.ubicacion.provincia}`
          : c.ubicacion?.raw ?? "—",
    },
    {
      key: "renovacion",
      label: "Próximo cobro esperado",
      sortable: true,
      align: "right",
      render: (c) => {
        if (c.diasParaRenovacion === null || !c.proximaRenovacion) {
          return <span className="muted">—</span>;
        }
        const fecha = new Date(c.proximaRenovacion).toLocaleDateString("es-PE");
        const badge =
          c.diasParaRenovacion < 0 ? (
            <Badge tone="critical">Vencida</Badge>
          ) : (
            <Badge tone={c.diasParaRenovacion <= 7 ? "warning" : "neutral"}>
              {c.diasParaRenovacion} día(s)
            </Badge>
          );
        return (
          <div className="cell-stack-end">
            {badge}
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              {fecha}
            </span>
          </div>
        );
      },
    },
    {
      key: "actividad",
      label: "Última actividad",
      sortable: true,
      align: "right",
      // fechaInactivo (Administrativo/post-venta, fecha_inactivo_formato) es la
      // fecha/hora real de ultimo ingreso del cliente a su sistema.
      render: (c) => {
        const fecha = c.ordenVigente.postVentaExtra?.fechaInactivo;
        if (c.diasSinActividad === null || !fecha) return <span className="muted">—</span>;
        const badge =
          c.diasSinActividad <= 7 ? (
            <Badge tone="success">{c.diasSinActividad} día(s)</Badge>
          ) : c.diasSinActividad <= 30 ? (
            <Badge tone="neutral">{c.diasSinActividad} día(s)</Badge>
          ) : (
            <Badge tone="warning">{c.diasSinActividad} día(s)</Badge>
          );
        return (
          <div className="cell-stack-end">
            <span>{new Date(fecha).toLocaleString("es-PE")}</span>
            {badge}
          </div>
        );
      },
    },
    {
      key: "alertas",
      label: "Alertas",
      align: "center",
      render: (c) => {
        const { CRITICAL, WARNING, INFO } = c.metadata.alertasCount;
        const total = CRITICAL + WARNING + INFO;
        if (total === 0) return <span className="muted">—</span>;
        const tone = CRITICAL > 0 ? "critical" : WARNING > 0 ? "warning" : "info";
        return <Badge tone={tone}>{total}</Badge>;
      },
    },
    {
      key: "tareas",
      label: "Tareas asignadas",
      align: "center",
      render: (c) => {
        const abiertas = c.metadata.tareasAbiertasCount;
        if (abiertas === 0) return <span className="muted">—</span>;
        return <Badge tone="info">{abiertas}</Badge>;
      },
    },
    {
      key: "oportunidad",
      label: "Oportunidad",
      align: "center",
      render: (c) =>
        clientesConOportunidad.has(c.numeroDocumentoCliente) ? (
          <Badge tone="success">🎯 Sí</Badge>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      // Ordenes DISTINTAS a la vigente de este RUC con un episodio de
      // recuperacion abierto — nunca reemplaza ni oculta la fila (que sigue
      // mostrando la orden activa), solo avisa que hay otro sistema aparte.
      key: "recuperacion",
      label: "Recuperación",
      align: "center",
      render: (c) => {
        const n = c.recuperacionAbiertaCount ?? 0;
        if (n === 0) return <span className="muted">—</span>;
        return (
          <Badge tone="warning">
            {n} sistema{n === 1 ? "" : "s"} en recuperación
          </Badge>
        );
      },
    },
  ];
}

export const COLUMN_OPTIONS: ColumnOption[] = buildAllColumns(new Set()).map((c) => ({
  key: c.key,
  label: c.label,
}));

// Set inicial minimo — con los 21 campos disponibles, mostrar todo de
// entrada satura el cuadro. El resto (segmento, rubro, alertas, etc.) sigue
// disponible en "Agregar/quitar columnas", y cada usuario lo ajusta a su
// gusto (persistido en localStorage) — esto es solo lo que ve alguien que
// nunca lo toco.
export const DEFAULT_VISIBLE_COLUMNS = [
  "estado",
  "cliente",
  "telefono",
  "plan",
  "deuda",
  "alertas",
  "ingresosMensuales",
  "renovacion",
  "ejecutivo",
  "recuperacion",
];

// Acciones no vive en buildAllColumns (necesita handlers de la pagina), pero
// se define aca para que Clientes.tsx no cargue con este bloque tambien.
// Consolida en un unico ⚙ (ActionMenu) lo que antes eran 2 botones sueltos
// en esta columna (Ver ficha / Agendar-Interes) mas Llamar/WhatsApp que
// vivian en la columna Telefono — ninguna accion se elimino, solo se movio.
export function buildAccionesColumn(handlers: {
  onAgendar: (c: PostVentaCliente) => void;
  onCrearTarea: (c: PostVentaCliente) => void;
  onCrearIncidencia: (c: PostVentaCliente) => void;
  onRegistrarSeguimiento: (c: PostVentaCliente) => void;
}): DataTableColumn<PostVentaCliente> {
  const { onAgendar, onCrearTarea, onCrearIncidencia, onRegistrarSeguimiento } = handlers;
  return {
    key: "acciones",
    label: "",
    align: "center",
    render: (c) => {
      const items: ActionMenuItem[] = [
        { key: "agendar", label: "Agendar / Interés", onSelect: () => onAgendar(c) },
        { key: "ficha", label: "Abrir ficha", to: `/clientes/${c.numeroDocumentoCliente}` },
        ...buildContactoMenuItems({
          numeroDocumentoCliente: c.numeroDocumentoCliente,
          idOrdenServicio: c.ordenVigente.idOrdenServicio,
          telefonoLimpio: c.telefonoEfectivo,
        }),
        { key: "crear-tarea", label: "Crear tarea", onSelect: () => onCrearTarea(c) },
        { key: "crear-incidencia", label: "Crear incidencia", onSelect: () => onCrearIncidencia(c) },
        {
          key: "registrar-seguimiento",
          label: "Registrar seguimiento",
          onSelect: () => onRegistrarSeguimiento(c),
        },
        { key: "ver-alertas", label: "Ver alertas", to: `/alertas?cliente=${c.numeroDocumentoCliente}` },
        {
          key: "ver-oportunidades",
          label: "Ver oportunidades",
          to: `/clientes/${c.numeroDocumentoCliente}?tab=oportunidades`,
        },
      ];
      return <ActionMenu label={`Acciones para ${c.nombreCliente}`} items={items} />;
    },
  };
}
