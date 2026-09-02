import { useMemo, useState } from "react";
import { AccionesClienteDrawer, columnaAccionesCliente } from "../components/panels/AccionesClienteDrawer";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { ClienteCell } from "../components/ui/ClienteCell";
import { CollapsibleCard } from "../components/ui/CollapsibleCard";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { FilterBar } from "../components/ui/FilterBar";
import { KpiCard } from "../components/ui/KpiCard";
import { SegmentoPill } from "../components/ui/StatusPill";
import { ExportButtons } from "../components/ui/ExportButtons";
import { useClientes } from "../hooks/useClientes";
import type { PagoNormalizado, Periodicidad, PostVentaCliente } from "../types/postventaCliente";
import { exportarExcel, exportarPdf, type ExportColumn } from "../utils/exportTable";
import { formatCurrency, formatNumber } from "../utils/format";

// Se trae todo de una — no es paginado como Clientes, el objetivo es
// dimensionar el riesgo/oportunidad de un vistazo. Alcanza para cualquier
// tamaño realista de cartera.
const PAGE_SIZE = 1000;

type Alcance = "ventana" | "esteMes" | "mesEspecifico" | "todos";
type Vista = "proximas" | "vencidas" | "cobranzaMensual";
type PeriodicidadFiltro = "" | "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

// "En problema" = ya viene golpeado, no es una renovacion que simplemente se
// acerca: segmento Critico (atraso de pago calculado) o ya SUSPENDIDO POR
// PAGO en APIWorking. Deliberadamente NO incluye "INICIAR COBRANZA" — es el
// estado de ~80% de toda la cartera (parece el estado operativo normal de un
// cliente activo en APIWorking, no una alarma).
//
// Para estos clientes, "proximaRenovacion" es enganoso: al estar calculada
// siempre hacia adelante (ver calcularProximoVencimiento en el backend),
// muestra el proximo ciclo teorico como si fuera un vencimiento normal,
// aunque el cliente lleve meses sin pagar el ciclo anterior. La pestana "Ya
// vencidas" usa diasVencido/vencidoDesde (calculado en el backend a partir
// del ultimo comprobante real impago, no del calendario que sigue avanzando
// solo tras una suspension) en vez de proximaRenovacion, para no confundir
// "esta por vencer" con "ya vencio y sigue sin pagar".
function esProblema(cliente: PostVentaCliente): boolean {
  return (
    cliente.segmentoEfectivo === "CRITICO" ||
    cliente.ordenVigente.nEstadoApiWorking.trim().toUpperCase() === "SUSPENDIDO POR PAGO"
  );
}

// "Ya pago el ciclo que viene" = su comprobante mas reciente en pagos[] fue
// emitido despues de ultimoVencimientoPago — es decir, ya existe una factura
// (y esta pagada, porque si no seria Critico y no estaria en "sanas") que
// cubre el ciclo actual/que esta por vencer, no solo el anterior. Distingue
// "ya esta resuelto, no hace falta contactarlo" de "todavia no le llega la
// factura de este ciclo, hay que estar atento".
function yaPagoProximoCiclo(cliente: PostVentaCliente): boolean {
  const pagos = cliente.ordenVigente.pagos.filter(
    (p): p is typeof p & { fechaEmitido: string } => p.fechaEmitido !== null
  );
  if (pagos.length === 0 || !cliente.ultimoVencimientoPago) return false;
  const masReciente = pagos.reduce((a, b) => (a.fechaEmitido > b.fechaEmitido ? a : b));
  return masReciente.fechaEmitido >= cliente.ultimoVencimientoPago;
}

function esDeEsteMes(proximaRenovacionIso: string | null, ahora: Date): boolean {
  if (!proximaRenovacionIso) return false;
  const fecha = new Date(proximaRenovacionIso);
  return fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth();
}

function esDelMes(iso: string | null, mesInfo: MesInfo): boolean {
  if (!iso) return false;
  const fecha = new Date(iso);
  return fecha.getFullYear() === mesInfo.anio && fecha.getMonth() === mesInfo.mes;
}

// ---------------------------------------------------------------------------
// Cobranza Mensual — solo para clientes MENSUAL: al facturarse todos los
// meses, Junio/Julio/Agosto son directamente comparables mes a mes (a
// diferencia de Trimestral/Semestral/Anual, donde "el mes pasado" no dice
// nada del ciclo de facturacion). Se compara contra data real (comprobantes
// ya emitidos), nunca se proyecta un monto que no salga de un comprobante.
// ---------------------------------------------------------------------------

interface MesInfo {
  anio: number;
  mes: number; // 0-indexado, como Date.getMonth()
  label: string;
}

function mesRelativo(ahora: Date, offsetMeses: number): MesInfo {
  const d = new Date(ahora.getFullYear(), ahora.getMonth() + offsetMeses, 1);
  return {
    anio: d.getFullYear(),
    mes: d.getMonth(),
    label: d.toLocaleDateString("es-PE", { month: "long", year: "numeric" }),
  };
}

interface ResumenMesCliente {
  facturado: number;
  deuda: number;
  tieneComprobante: boolean;
}

function resumenMesCliente(cliente: PostVentaCliente, anio: number, mes: number): ResumenMesCliente {
  const delMes = cliente.ordenVigente.pagos.filter((p): p is PagoNormalizado & { fechaEmitido: string } => {
    if (!p.fechaEmitido) return false;
    const f = new Date(p.fechaEmitido);
    return f.getFullYear() === anio && f.getMonth() === mes;
  });
  return {
    facturado: delMes.reduce((s, p) => s + p.total, 0),
    deuda: delMes.reduce((s, p) => s + p.deuda, 0),
    tieneComprobante: delMes.length > 0,
  };
}

type EstadoMes = "PAGADO" | "DEBE" | "PENDIENTE" | "VENCIDO_SIN_FACTURAR" | "SIN_COMPROBANTE";

const ESTADO_MES_BADGE: Record<EstadoMes, { label: string; tone: BadgeTone }> = {
  PAGADO: { label: "Pagado", tone: "success" },
  DEBE: { label: "Debe", tone: "critical" },
  PENDIENTE: { label: "Pendiente de facturar", tone: "neutral" },
  VENCIDO_SIN_FACTURAR: { label: "Vencido sin facturar", tone: "critical" },
  SIN_COMPROBANTE: { label: "Sin comprobante", tone: "neutral" },
};

// Clasifica un mes puntual para un cliente mensual. "Pendiente de facturar"
// y "Vencido sin facturar" solo tienen sentido para el mes EN CURSO (se
// comparan contra "hoy") — para un mes ya cerrado, sin comprobante es
// simplemente "Sin comprobante", no hay nada que esperar.
function estadoDelMes(
  cliente: PostVentaCliente,
  mesInfo: MesInfo,
  ahora: Date,
  esMesActual: boolean
): EstadoMes {
  const resumen = resumenMesCliente(cliente, mesInfo.anio, mesInfo.mes);
  if (resumen.tieneComprobante) {
    return resumen.deuda > 0 ? "DEBE" : "PAGADO";
  }
  if (!esMesActual) return "SIN_COMPROBANTE";
  if (esDeEsteMes(cliente.ultimoVencimientoPago, ahora)) {
    return "VENCIDO_SIN_FACTURAR";
  }
  return "PENDIENTE";
}

function renderResumenMes(r: ResumenMesCliente) {
  if (!r.tieneComprobante) return <span className="muted">—</span>;
  return (
    <span style={r.deuda > 0 ? { color: "var(--color-critical)", fontWeight: 600 } : undefined}>
      {formatCurrency(r.facturado)}
    </span>
  );
}

function columnasCobranzaMensual(
  mesSeleccionado: MesInfo,
  ahora: Date,
  esMesActual: boolean,
  onAbrirAcciones: (numeroDocumentoCliente: string) => void
): DataTableColumn<PostVentaCliente>[] {
  return [
    columnaAccionesCliente<PostVentaCliente>((c) => c.numeroDocumentoCliente, onAbrirAcciones),
    {
      key: "cliente",
      label: "Cliente",
      render: (c) => (
        <ClienteCell
          numeroDocumentoCliente={c.numeroDocumentoCliente}
          nombreCliente={c.nombreCliente}
          sistemas={c.sistemas}
        />
      ),
    },
    {
      key: "monto",
      label: mesSeleccionado.label,
      align: "right",
      render: (c) => renderResumenMes(resumenMesCliente(c, mesSeleccionado.anio, mesSeleccionado.mes)),
    },
    {
      key: "estado",
      label: "Estado",
      align: "center",
      render: (c) => {
        const cfg = ESTADO_MES_BADGE[estadoDelMes(c, mesSeleccionado, ahora, esMesActual)];
        return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
      },
    },
    { key: "ejecutivo", label: "Ejecutivo", render: (c) => c.ordenVigente.ejecutivo ?? "—" },
  ];
}

// ---------------------------------------------------------------------------
// Resumen de renovaciones por periodicidad — a diferencia de Cobranza
// Mensual (solo Mensual, compara meses cerrados), esto cubre las 4
// periodicidades y solo mira hacia adelante (mes actual + futuros), para
// responder "cuantos ya renovaron este mes y cuantos faltan, por tipo de
// plan, y cuanto se obtendria/se va obteniendo".
// ---------------------------------------------------------------------------

const PERIODICIDADES: Exclude<Periodicidad, "DESCONOCIDO">[] = [
  "MENSUAL",
  "TRIMESTRAL",
  "SEMESTRAL",
  "ANUAL",
];

const PERIODICIDAD_LABEL: Record<Exclude<Periodicidad, "DESCONOCIDO">, string> = {
  MENSUAL: "Mensual",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
};

// Mismo criterio de origen que usa el backend para anclar la renovacion de
// Semestral/Anual (ver calcularProximaRenovacionDesdeComprobante en
// facturacion.ts) — un cargo suelto ("Directo", "Administrativo Equipo") no
// cuenta como renovacion real para esos casos. Mensual/Trimestral no
// necesitan este filtro: casi todo lo que factura esa OS es el ciclo mismo.
const ORIGENES_RENOVACION_REAL = new Set(["Administrativo Anualidad", "Administrativo Plan"]);

function comprobantesRenovacionDelMes(
  cliente: PostVentaCliente,
  mesInfo: MesInfo
): (PagoNormalizado & { fechaEmitido: string })[] {
  const delMes = cliente.ordenVigente.pagos.filter(
    (p): p is PagoNormalizado & { fechaEmitido: string } => {
      if (!p.fechaEmitido) return false;
      const f = new Date(p.fechaEmitido);
      return f.getFullYear() === mesInfo.anio && f.getMonth() === mesInfo.mes;
    }
  );
  const periodicidad = cliente.planActual.periodicidad;
  if (periodicidad !== "SEMESTRAL" && periodicidad !== "ANUAL") return delMes;
  const relevantes = delMes.filter((p) => ORIGENES_RENOVACION_REAL.has(p.origen));
  return relevantes.length > 0 ? relevantes : delMes;
}

interface ClienteRenovacionMes {
  cliente: PostVentaCliente;
  periodicidad: Exclude<Periodicidad, "DESCONOCIDO">;
  monto: number;
  fecha: string | null;
}

interface PeriodicidadResumenMes {
  periodicidad: Exclude<Periodicidad, "DESCONOCIDO">;
  yaRenovaronCount: number;
  yaRenovaronMonto: number;
  yaRenovaronClientes: ClienteRenovacionMes[];
  faltanRenovarCount: number;
  faltanRenovarMonto: number;
  faltanRenovarClientes: ClienteRenovacionMes[];
  totalEsperadoMonto: number;
}

function calcularResumenPorPeriodicidad(
  todos: PostVentaCliente[],
  mesInfo: MesInfo
): PeriodicidadResumenMes[] {
  return PERIODICIDADES.map((periodicidad) => {
    const deEstaPeriodicidad = todos.filter((c) => c.planActual.periodicidad === periodicidad);

    // "Ya renovaron" = tienen un comprobante de renovacion real emitido en
    // este mes calendario — no importa si venian sanos o en problema antes.
    let yaRenovaronMonto = 0;
    const yaRenovaronClientes: ClienteRenovacionMes[] = [];
    for (const c of deEstaPeriodicidad) {
      const comprobantes = comprobantesRenovacionDelMes(c, mesInfo);
      if (comprobantes.length === 0) continue;
      const facturado = comprobantes.reduce((s, p) => s + p.total, 0);
      const deuda = comprobantes.reduce((s, p) => s + p.deuda, 0);
      const monto = facturado - deuda; // solo lo efectivamente cobrado
      yaRenovaronMonto += monto;
      const fecha = comprobantes.reduce((a, b) => (a.fechaEmitido > b.fechaEmitido ? a : b)).fechaEmitido;
      yaRenovaronClientes.push({ cliente: c, periodicidad, monto, fecha });
    }

    // "Faltan renovar" = su proximo ciclo cae en este mes y todavia no lo
    // pagaron (sanas) + los que ya se vencieron exactamente este mes sin
    // pagar (problema). No se cuentan vencidos de meses anteriores aca —
    // esos son el historico de "Ya vencidas", no "de este mes".
    const sanasDelMes = deEstaPeriodicidad.filter(
      (c) => !esProblema(c) && esDelMes(c.proximaRenovacion, mesInfo)
    );
    const vencidasDelMes = deEstaPeriodicidad.filter(
      (c) => esProblema(c) && esDelMes(c.vencidoDesde, mesInfo)
    );
    const faltanRenovarClientes: ClienteRenovacionMes[] = [
      ...sanasDelMes.map((c) => ({
        cliente: c,
        periodicidad,
        monto: c.ingresoMensualReal ?? 0,
        fecha: c.proximaRenovacion,
      })),
      ...vencidasDelMes.map((c) => ({
        cliente: c,
        periodicidad,
        monto: c.ingresoMensualReal ?? 0,
        fecha: c.vencidoDesde,
      })),
    ];
    const faltanRenovarMonto = faltanRenovarClientes.reduce((s, r) => s + r.monto, 0);

    return {
      periodicidad,
      yaRenovaronCount: yaRenovaronClientes.length,
      yaRenovaronMonto,
      yaRenovaronClientes,
      faltanRenovarCount: faltanRenovarClientes.length,
      faltanRenovarMonto,
      faltanRenovarClientes,
      totalEsperadoMonto: yaRenovaronMonto + faltanRenovarMonto,
    };
  });
}

// Exporta la lista de clientes actualmente visible en el panel de
// renovaciones por periodicidad (respeta el filtro de periodicidad y el mes
// elegido) — todo del lado del cliente, no hay endpoint nuevo: el dataset ya
// esta cargado en memoria.
function exportarClientesCsv(
  filas: ClienteRenovacionMes[],
  tipo: "yaRenovaron" | "faltanRenovar",
  mesLabel: string
) {
  const headers = [
    "Cliente",
    "RUC/DNI",
    "Periodicidad",
    "Plan",
    tipo === "yaRenovaron" ? "Fecha de pago" : "Vence / vencido desde",
    "Monto",
    "Estado",
    "Ejecutivo",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const filasCsv = filas.map((r) => [
    r.cliente.nombreCliente,
    r.cliente.numeroDocumentoCliente,
    PERIODICIDAD_LABEL[r.periodicidad],
    r.cliente.planActual.nombre,
    r.fecha ? new Date(r.fecha).toLocaleDateString("es-PE") : "",
    r.monto.toFixed(2),
    tipo === "yaRenovaron" ? "Ya renovó" : esProblema(r.cliente) ? "Vencido" : "Pendiente",
    r.cliente.ordenVigente.ejecutivo ?? "",
  ]);
  const csv = [headers, ...filasCsv].map((fila) => fila.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `renovaciones_${tipo === "yaRenovaron" ? "ya_renovaron" : "faltan_renovar"}_${mesLabel.replace(/\s+/g, "_")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function columnasExportResumenMes(
  tipo: "yaRenovaron" | "faltanRenovar"
): ExportColumn<ClienteRenovacionMes>[] {
  return [
    { header: "Cliente", value: (r) => r.cliente.nombreCliente },
    { header: "RUC/DNI", value: (r) => r.cliente.numeroDocumentoCliente },
    { header: "Periodicidad", value: (r) => PERIODICIDAD_LABEL[r.periodicidad] },
    { header: "Plan", value: (r) => r.cliente.planActual.nombre },
    {
      header: tipo === "yaRenovaron" ? "Fecha de pago" : "Vence / vencido desde",
      value: (r) => (r.fecha ? new Date(r.fecha).toLocaleDateString("es-PE") : ""),
    },
    { header: "Monto", value: (r) => r.monto },
    {
      header: "Estado",
      value: (r) => (tipo === "yaRenovaron" ? "Ya renovó" : esProblema(r.cliente) ? "Vencido" : "Pendiente"),
    },
    { header: "Ejecutivo", value: (r) => r.cliente.ordenVigente.ejecutivo ?? "" },
  ];
}

function columnasClientesResumenMes(
  tipo: "yaRenovaron" | "faltanRenovar",
  onAbrirAcciones: (numeroDocumentoCliente: string) => void
): DataTableColumn<ClienteRenovacionMes>[] {
  return [
    columnaAccionesCliente<ClienteRenovacionMes>(
      (r) => r.cliente.numeroDocumentoCliente,
      onAbrirAcciones
    ),
    {
      key: "cliente",
      label: "Cliente",
      render: (r) => (
        <ClienteCell
          numeroDocumentoCliente={r.cliente.numeroDocumentoCliente}
          nombreCliente={r.cliente.nombreCliente}
          sistemas={r.cliente.sistemas}
        />
      ),
    },
    {
      key: "periodicidad",
      label: "Periodicidad",
      render: (r) => PERIODICIDAD_LABEL[r.periodicidad],
    },
    { key: "plan", label: "Plan", render: (r) => r.cliente.planActual.nombre },
    {
      key: "fecha",
      label: tipo === "yaRenovaron" ? "Fecha de pago" : "Vence / vencido desde",
      render: (r) => (r.fecha ? new Date(r.fecha).toLocaleDateString("es-PE") : "—"),
    },
    {
      key: "monto",
      label: tipo === "yaRenovaron" ? "Monto cobrado" : "Monto estimado",
      align: "right",
      render: (r) => formatCurrency(r.monto),
    },
    { key: "estado", label: "Estado", align: "center", render: (r) => (
      tipo === "yaRenovaron" ? (
        <Badge tone="success">Ya renovó</Badge>
      ) : esProblema(r.cliente) ? (
        <Badge tone="critical">Vencido</Badge>
      ) : (
        <Badge tone="warning">Pendiente</Badge>
      )
    ) },
    { key: "ejecutivo", label: "Ejecutivo", render: (r) => r.cliente.ordenVigente.ejecutivo ?? "—" },
  ];
}

const columnasResumenPeriodicidad: DataTableColumn<PeriodicidadResumenMes>[] = [
  { key: "periodicidad", label: "Periodicidad", render: (r) => PERIODICIDAD_LABEL[r.periodicidad] },
  {
    key: "yaRenovaron",
    label: "Ya renovaron",
    align: "right",
    render: (r) => formatNumber(r.yaRenovaronCount),
  },
  {
    key: "montoRenovado",
    label: "Monto cobrado",
    align: "right",
    render: (r) => formatCurrency(r.yaRenovaronMonto),
  },
  {
    key: "faltan",
    label: "Faltan renovar",
    align: "right",
    render: (r) =>
      r.faltanRenovarCount > 0 ? (
        <Badge tone="warning">{formatNumber(r.faltanRenovarCount)}</Badge>
      ) : (
        formatNumber(0)
      ),
  },
  {
    key: "montoPendiente",
    label: "Monto pendiente",
    align: "right",
    render: (r) => formatCurrency(r.faltanRenovarMonto),
  },
  {
    key: "totalEsperado",
    label: "Total esperado del mes",
    align: "right",
    render: (r) => <strong>{formatCurrency(r.totalEsperadoMonto)}</strong>,
  },
];

function proximaBadge(dias: number | null) {
  if (dias === null) return <span className="muted">—</span>;
  if (dias <= 7) return <Badge tone="critical">{dias} día(s)</Badge>;
  if (dias <= 15) return <Badge tone="warning">{dias} día(s)</Badge>;
  return <Badge tone="neutral">{dias} día(s)</Badge>;
}

// "desc" (default, igual que antes) = antiguos primero (mas dias vencido
// arriba). "asc" = recientes primero. Sin dato (diasVencido null) siempre al
// final, en cualquiera de los dos sentidos — no tiene sentido intercalarlo
// entre fechas reales.
function compararVencidos(a: PostVentaCliente, b: PostVentaCliente, dir: "asc" | "desc"): number {
  if (a.diasVencido === null && b.diasVencido === null) return 0;
  if (a.diasVencido === null) return 1;
  if (b.diasVencido === null) return -1;
  return dir === "desc" ? b.diasVencido - a.diasVencido : a.diasVencido - b.diasVencido;
}

function vencidaBadge(dias: number | null) {
  if (dias === null) return <span className="muted">No determinado</span>;
  return <Badge tone="critical">{dias} día(s)</Badge>;
}

function columnasProximas(
  onAbrirAcciones: (numeroDocumentoCliente: string) => void
): DataTableColumn<PostVentaCliente>[] {
  return [
  columnaAccionesCliente<PostVentaCliente>((c) => c.numeroDocumentoCliente, onAbrirAcciones),
  { key: "renovacion", label: "Vence en", render: (c) => proximaBadge(c.diasParaRenovacion) },
  {
    key: "cliente",
    label: "Cliente",
    render: (c) => (
      <ClienteCell
        numeroDocumentoCliente={c.numeroDocumentoCliente}
        nombreCliente={c.nombreCliente}
        sistemas={c.sistemas}
      />
    ),
  },
  {
    key: "plan",
    label: "Plan",
    render: (c) => `${c.planActual.nombre} (${c.planActual.periodicidad.toLowerCase()})`,
  },
  {
    key: "fecha",
    label: "Fecha estimada",
    render: (c) =>
      c.proximaRenovacion ? new Date(c.proximaRenovacion).toLocaleDateString("es-PE") : "—",
  },
  {
    key: "segmento",
    label: "Segmento",
    render: (c) => <SegmentoPill segmento={c.segmentoEfectivo} manual={!!c.segmentoManual} />,
  },
  {
    key: "pago",
    label: "Pago",
    align: "center",
    render: (c) =>
      yaPagoProximoCiclo(c) ? (
        <Badge tone="success">Ya pagó</Badge>
      ) : (
        <Badge tone="warning">Pendiente</Badge>
      ),
  },
  {
    key: "ingresos",
    label: "Ingresos mensuales (real)",
    align: "right",
    render: (c) =>
      c.ingresoMensualReal == null ? "—" : formatCurrency(c.ingresoMensualReal),
  },
  { key: "ejecutivo", label: "Ejecutivo", render: (c) => c.ordenVigente.ejecutivo ?? "—" },
  ];
}

const columnasExportProximas: ExportColumn<PostVentaCliente>[] = [
  { header: "Cliente", value: (c) => c.nombreCliente },
  { header: "RUC/DNI", value: (c) => c.numeroDocumentoCliente },
  { header: "Plan", value: (c) => c.planActual.nombre },
  { header: "Periodicidad", value: (c) => c.planActual.periodicidad },
  { header: "Vence en (días)", value: (c) => c.diasParaRenovacion ?? "" },
  {
    header: "Fecha estimada",
    value: (c) => (c.proximaRenovacion ? new Date(c.proximaRenovacion).toLocaleDateString("es-PE") : ""),
  },
  { header: "Segmento", value: (c) => c.segmentoEfectivo ?? "" },
  { header: "Pago", value: (c) => (yaPagoProximoCiclo(c) ? "Ya pagó" : "Pendiente") },
  { header: "Ingresos mensuales (real)", value: (c) => c.ingresoMensualReal ?? "" },
  { header: "Ejecutivo", value: (c) => c.ordenVigente.ejecutivo ?? "" },
];

function columnasVencidas(
  onAbrirAcciones: (numeroDocumentoCliente: string) => void
): DataTableColumn<PostVentaCliente>[] {
  return [
  columnaAccionesCliente<PostVentaCliente>((c) => c.numeroDocumentoCliente, onAbrirAcciones),
  { key: "vencido", label: "Vencido hace", sortable: true, render: (c) => vencidaBadge(c.diasVencido) },
  {
    key: "cliente",
    label: "Cliente",
    render: (c) => (
      <ClienteCell
        numeroDocumentoCliente={c.numeroDocumentoCliente}
        nombreCliente={c.nombreCliente}
        sistemas={c.sistemas}
      />
    ),
  },
  {
    key: "plan",
    label: "Plan",
    render: (c) => `${c.planActual.nombre} (${c.planActual.periodicidad.toLowerCase()})`,
  },
  {
    key: "vencidoDesde",
    label: "Vencido desde",
    render: (c) => (c.vencidoDesde ? new Date(c.vencidoDesde).toLocaleDateString("es-PE") : "—"),
  },
  {
    key: "estadoApiWorking",
    label: "Estado",
    render: (c) => c.ordenVigente.nEstadoApiWorking,
  },
  {
    key: "ingresos",
    label: "Ingresos mensuales (real)",
    align: "right",
    render: (c) =>
      c.ingresoMensualReal == null ? "—" : formatCurrency(c.ingresoMensualReal),
  },
  {
    key: "deuda",
    label: "Deuda actual",
    align: "right",
    render: (c) => (
      <span style={c.deudaTotal > 0 ? { color: "var(--color-critical)", fontWeight: 600 } : undefined}>
        {formatCurrency(c.deudaTotal)}
      </span>
    ),
  },
  { key: "ejecutivo", label: "Ejecutivo", render: (c) => c.ordenVigente.ejecutivo ?? "—" },
  ];
}

const columnasExportVencidas: ExportColumn<PostVentaCliente>[] = [
  { header: "Cliente", value: (c) => c.nombreCliente },
  { header: "RUC/DNI", value: (c) => c.numeroDocumentoCliente },
  { header: "Plan", value: (c) => c.planActual.nombre },
  { header: "Vencido hace (días)", value: (c) => c.diasVencido ?? "" },
  {
    header: "Vencido desde",
    value: (c) => (c.vencidoDesde ? new Date(c.vencidoDesde).toLocaleDateString("es-PE") : ""),
  },
  { header: "Estado", value: (c) => c.ordenVigente.nEstadoApiWorking },
  { header: "Ingresos mensuales (real)", value: (c) => c.ingresoMensualReal ?? "" },
  { header: "Deuda actual", value: (c) => c.deudaTotal },
  { header: "Ejecutivo", value: (c) => c.ordenVigente.ejecutivo ?? "" },
];

function columnasExportCobranzaMensual(mesSeleccionado: MesInfo): ExportColumn<PostVentaCliente>[] {
  return [
    { header: "Cliente", value: (c) => c.nombreCliente },
    { header: "RUC/DNI", value: (c) => c.numeroDocumentoCliente },
    {
      header: mesSeleccionado.label,
      value: (c) => resumenMesCliente(c, mesSeleccionado.anio, mesSeleccionado.mes).facturado,
    },
    { header: "Ejecutivo", value: (c) => c.ordenVigente.ejecutivo ?? "" },
  ];
}

export function RenovacionesPage() {
  const [vista, setVista] = useState<Vista>("proximas");
  const [alcance, setAlcance] = useState<Alcance>("esteMes");
  const [periodicidadFiltro, setPeriodicidadFiltro] = useState<PeriodicidadFiltro>("");
  // mesFuturoOffset: 0 = mes actual, 1 = +1 mes, -1 = mes pasado, etc. — a
  // diferencia de "Ya vencidas" (que solo mira vencidos historicos sin
  // resolver, no por mes) y "Cobranza Mensual" (que solo cubre clientes
  // Mensual), este panel es el unico que da la foto completa "quien ya
  // renovo / quien falto" de las 4 periodicidades para un mes cerrado —
  // util para revisar como cerro el mes pasado, no solo mirar adelante.
  const [mesFuturoOffset, setMesFuturoOffset] = useState(0);
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  // Sin filtro en el pedido: se trae todo una sola vez (el backend ya calcula
  // renovacionEnAlerta/proximaRenovacion/ultimoVencimientoPago por cliente) y
  // de ahi se derivan tanto los KPIs como ambas tablas.
  const { data, loading, error } = useClientes({
    sortBy: "diasParaRenovacion",
    sortDir: "asc",
    pageSize: PAGE_SIZE,
  });

  const ahora = useMemo(() => new Date(), [data]);
  const todos = data?.data ?? [];
  const sanas = useMemo(() => todos.filter((c) => c.diasParaRenovacion !== null && !esProblema(c)), [todos]);
  const problema = useMemo(() => todos.filter(esProblema), [todos]);

  const mesFuturo = useMemo(() => mesRelativo(ahora, mesFuturoOffset), [ahora, mesFuturoOffset]);

  const resumenPorPeriodicidad = useMemo(
    () => calcularResumenPorPeriodicidad(todos, mesFuturo),
    [todos, mesFuturo]
  );

  // Lista de clientes detras del resumen por periodicidad — para que no se
  // quede solo en numeros. "faltanRenovar" arranca seleccionado por ser el
  // mas accionable (a quien hay que contactar).
  const [vistaMesTipo, setVistaMesTipo] = useState<"yaRenovaron" | "faltanRenovar">("faltanRenovar");
  const clientesResumenMes = useMemo(() => {
    const relevantes = periodicidadFiltro
      ? resumenPorPeriodicidad.filter((r) => r.periodicidad === periodicidadFiltro)
      : resumenPorPeriodicidad;
    const lista =
      vistaMesTipo === "yaRenovaron"
        ? relevantes.flatMap((r) => r.yaRenovaronClientes)
        : relevantes.flatMap((r) => r.faltanRenovarClientes);
    return [...lista].sort((a, b) => b.monto - a.monto);
  }, [resumenPorPeriodicidad, vistaMesTipo, periodicidadFiltro]);
  const columnasClientesResumen = useMemo(
    () => columnasClientesResumenMes(vistaMesTipo, setClienteSeleccionado),
    [vistaMesTipo]
  );

  const resumenTotal = useMemo(
    () =>
      resumenPorPeriodicidad.reduce(
        (acc, r) => ({
          yaRenovaronCount: acc.yaRenovaronCount + r.yaRenovaronCount,
          yaRenovaronMonto: acc.yaRenovaronMonto + r.yaRenovaronMonto,
          faltanRenovarCount: acc.faltanRenovarCount + r.faltanRenovarCount,
          faltanRenovarMonto: acc.faltanRenovarMonto + r.faltanRenovarMonto,
          totalEsperadoMonto: acc.totalEsperadoMonto + r.totalEsperadoMonto,
        }),
        {
          yaRenovaronCount: 0,
          yaRenovaronMonto: 0,
          faltanRenovarCount: 0,
          faltanRenovarMonto: 0,
          totalEsperadoMonto: 0,
        }
      ),
    [resumenPorPeriodicidad]
  );

  const filasProximas = useMemo(() => {
    const base = periodicidadFiltro
      ? sanas.filter((c) => c.planActual.periodicidad === periodicidadFiltro)
      : sanas;
    if (alcance === "ventana") return base.filter((c) => c.renovacionEnAlerta);
    if (alcance === "esteMes") return base.filter((c) => esDeEsteMes(c.proximaRenovacion, ahora));
    if (alcance === "mesEspecifico") return base.filter((c) => esDelMes(c.proximaRenovacion, mesFuturo));
    return base;
  }, [alcance, sanas, ahora, periodicidadFiltro, mesFuturo]);

  const [ordenVencidas, setOrdenVencidas] = useState<"asc" | "desc">("desc");
  const filasVencidas = useMemo(
    () => [...problema].sort((a, b) => compararVencidos(a, b, ordenVencidas)),
    [problema, ordenVencidas]
  );

  // Cobranza Mensual: solo clientes Mensual, sin importar si estan "sanos" o
  // "en problema" — el objetivo aca es ver la foto completa de facturacion
  // real mes a mes, no el filtro de riesgo de las otras pestañas.
  const mensuales = useMemo(
    () => todos.filter((c) => c.planActual.periodicidad === "MENSUAL"),
    [todos]
  );

  // mesOffset: 0 = mes actual, -1 = mes anterior, etc. — nunca positivo, no
  // tiene sentido navegar a un mes futuro sin datos.
  const [mesOffset, setMesOffset] = useState(0);
  const mesSeleccionado = useMemo(() => mesRelativo(ahora, mesOffset), [ahora, mesOffset]);
  const esMesActual = mesOffset === 0;

  const cobranzaMensual = useMemo(() => {
    let facturado = 0;
    let pagado = 0;
    let conDeuda = 0;
    let clientesConComprobante = 0;
    const estados: Record<EstadoMes, number> = {
      PAGADO: 0,
      DEBE: 0,
      PENDIENTE: 0,
      VENCIDO_SIN_FACTURAR: 0,
      SIN_COMPROBANTE: 0,
    };
    for (const c of mensuales) {
      const r = resumenMesCliente(c, mesSeleccionado.anio, mesSeleccionado.mes);
      if (r.tieneComprobante) {
        clientesConComprobante += 1;
        facturado += r.facturado;
        if (r.deuda > 0) conDeuda += r.deuda;
        else pagado += r.facturado;
      }
      estados[estadoDelMes(c, mesSeleccionado, ahora, esMesActual)] += 1;
    }
    return {
      facturado,
      pagado,
      conDeuda,
      clientesConComprobante,
      estados,
    };
  }, [mensuales, mesSeleccionado, ahora, esMesActual]);

  const columnasCobranza = useMemo(
    () => columnasCobranzaMensual(mesSeleccionado, ahora, esMesActual, setClienteSeleccionado),
    [mesSeleccionado, ahora, esMesActual]
  );

  // Datos a exportar segun la pestaña activa (Proxima/Vencidas/Cobranza
  // Mensual) — las 3 comparten PostVentaCliente como fila, asi que un solo
  // botonera de export sirve para las 3 sin repetir el bloque de botones.
  const exportVistaActual = useMemo(() => {
    if (vista === "vencidas") {
      return {
        filas: filasVencidas,
        columnas: columnasExportVencidas,
        nombreArchivo: "renovaciones_ya_vencidas",
        titulo: "Renovaciones — Ya vencidas",
      };
    }
    if (vista === "cobranzaMensual") {
      return {
        filas: mensuales,
        columnas: columnasExportCobranzaMensual(mesSeleccionado),
        nombreArchivo: `cobranza_mensual_${mesSeleccionado.label.replace(/\s+/g, "_")}`,
        titulo: `Cobranza Mensual — ${mesSeleccionado.label}`,
      };
    }
    return {
      filas: filasProximas,
      columnas: columnasExportProximas,
      nombreArchivo: "renovaciones_proximas_a_vencer",
      titulo: "Renovaciones — Próximas a vencer",
    };
  }, [vista, filasProximas, filasVencidas, mensuales, mesSeleccionado]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Renovaciones</h1>
          <div className="page-header-subtitle">
            Próximo vencimiento de pago por cliente — asegurar el ingreso de los que vienen al
            día, y priorizar cobranza en los que ya están vencidos.
          </div>
        </div>
      </div>

      <CollapsibleCard
        titulo="Renovaciones por periodicidad"
        subtitulo={
          <span style={{ textTransform: "capitalize" }}>
            {mesFuturo.label}
            {mesFuturoOffset === 0 && " (mes actual)"}
          </span>
        }
        abierto={panelAbierto}
        onToggle={() => setPanelAbierto((v) => !v)}
        contador={resumenTotal.faltanRenovarCount}
        tone={resumenTotal.faltanRenovarCount > 0 ? "warning" : "success"}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <p className="muted" style={{ margin: 0, maxWidth: 560 }}>
            Quiénes ya renovaron este ciclo y quiénes todavía faltan, por tipo de plan —
            incluye planes trimestrales, semestrales y anuales, no solo mensuales. Monto
            cobrado según comprobantes reales, monto pendiente estimado según ingreso
            mensual real.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMesFuturoOffset((o) => o - 1)}
            >
              ← Mes anterior
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMesFuturoOffset((o) => o + 1)}
            >
              Mes siguiente →
            </button>
          </div>
        </div>

        <div className="kpi-grid" style={{ marginTop: 16 }}>
          <KpiCard
            label="Ya renovaron"
            value={resumenTotal.yaRenovaronCount}
            hint={`${formatCurrency(resumenTotal.yaRenovaronMonto)} cobrados`}
            tone="success"
          />
          <KpiCard
            label="Faltan renovar"
            value={resumenTotal.faltanRenovarCount}
            hint={`${formatCurrency(resumenTotal.faltanRenovarMonto)} pendientes (estimado)`}
            tone={resumenTotal.faltanRenovarCount > 0 ? "warning" : undefined}
          />
          <KpiCard
            label="Total esperado del mes"
            value={formatCurrency(resumenTotal.totalEsperadoMonto)}
            hint="Ya cobrado + pendiente estimado"
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <DataTable
            columns={columnasResumenPeriodicidad}
            rows={resumenPorPeriodicidad}
            rowKey={(r) => r.periodicidad}
            loading={loading}
            emptyMessage="Sin datos."
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 12,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={vistaMesTipo === "faltanRenovar" ? "btn btn-primary" : "btn btn-secondary"}
                onClick={() => setVistaMesTipo("faltanRenovar")}
              >
                Faltan renovar ({resumenTotal.faltanRenovarCount})
              </button>
              <button
                type="button"
                className={vistaMesTipo === "yaRenovaron" ? "btn btn-primary" : "btn btn-secondary"}
                onClick={() => setVistaMesTipo("yaRenovaron")}
              >
                Ya renovaron ({resumenTotal.yaRenovaronCount})
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                aria-label="Filtrar por periodicidad"
                value={periodicidadFiltro}
                onChange={(event) => setPeriodicidadFiltro(event.target.value as PeriodicidadFiltro)}
              >
                <option value="">Todas las periodicidades</option>
                <option value="MENSUAL">Mensual</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="SEMESTRAL">Semestral</option>
                <option value="ANUAL">Anual</option>
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => exportarClientesCsv(clientesResumenMes, vistaMesTipo, mesFuturo.label)}
                disabled={clientesResumenMes.length === 0}
              >
                CSV
              </button>
              <ExportButtons
                disabled={clientesResumenMes.length === 0}
                onExcel={() =>
                  exportarExcel(
                    `renovaciones_${vistaMesTipo}_${mesFuturo.label.replace(/\s+/g, "_")}`,
                    columnasExportResumenMes(vistaMesTipo),
                    clientesResumenMes
                  )
                }
                onPdf={() =>
                  exportarPdf(
                    `renovaciones_${vistaMesTipo}_${mesFuturo.label.replace(/\s+/g, "_")}`,
                    `Renovaciones — ${vistaMesTipo === "yaRenovaron" ? "Ya renovaron" : "Faltan renovar"} — ${mesFuturo.label}`,
                    columnasExportResumenMes(vistaMesTipo),
                    clientesResumenMes
                  )
                }
              />
            </div>
          </div>
          <DataTable
            columns={columnasClientesResumen}
            rows={clientesResumenMes}
            rowKey={(r) => `${r.cliente.numeroDocumentoCliente}-${r.periodicidad}`}
            loading={loading}
            emptyMessage={
              vistaMesTipo === "faltanRenovar"
                ? "No hay clientes pendientes de renovar en este mes."
                : "Todavía no hay clientes que hayan renovado en este mes."
            }
          />
        </div>
      </CollapsibleCard>

      {vista === "cobranzaMensual" && (
        <>
          <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
            Solo clientes Mensual ({formatNumber(mensuales.length)}) — se facturan todos los meses,
            así que cualquier mes es directamente comparable con otro. Todo sale de comprobantes
            reales ya emitidos, nunca se proyecta un monto inventado.
          </p>

          <div
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 16,
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMesOffset((o) => o - 1)}
            >
              ← Mes anterior
            </button>
            <strong
              style={{
                fontSize: 16,
                textTransform: "capitalize",
                minWidth: 180,
                textAlign: "center",
              }}
            >
              {mesSeleccionado.label}
              {esMesActual && " (en curso)"}
            </strong>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMesOffset((o) => o + 1)}
              disabled={esMesActual}
            >
              Mes siguiente →
            </button>
          </div>

          <div className="kpi-grid">
            <KpiCard
              label={`Facturado — ${mesSeleccionado.label}`}
              value={formatCurrency(cobranzaMensual.facturado)}
              hint={`${formatNumber(cobranzaMensual.clientesConComprobante)} de ${formatNumber(mensuales.length)} clientes con comprobante${esMesActual ? " hasta hoy" : " ese mes"}`}
            />
            <KpiCard
              label="Pagado"
              value={cobranzaMensual.estados.PAGADO}
              hint={formatCurrency(cobranzaMensual.pagado)}
              tone="success"
            />
            <KpiCard
              label="Debe"
              value={cobranzaMensual.estados.DEBE}
              hint={formatCurrency(cobranzaMensual.conDeuda)}
              tone={cobranzaMensual.estados.DEBE > 0 ? "critical" : undefined}
            />
            {esMesActual ? (
              <>
                <KpiCard
                  label="Pendiente de facturar"
                  value={cobranzaMensual.estados.PENDIENTE}
                  hint="Todavía no le toca — su fecha de cobro de este mes no llegó"
                />
                <KpiCard
                  label="Vencido sin facturar"
                  value={cobranzaMensual.estados.VENCIDO_SIN_FACTURAR}
                  hint="Ya pasó su fecha de cobro de este mes y no le llegó ningún comprobante"
                  tone={cobranzaMensual.estados.VENCIDO_SIN_FACTURAR > 0 ? "critical" : undefined}
                />
              </>
            ) : (
              <KpiCard
                label="Sin comprobante ese mes"
                value={cobranzaMensual.estados.SIN_COMPROBANTE}
                hint="No se le emitió ningún comprobante en ese mes"
              />
            )}
          </div>
        </>
      )}

      <div className="clientes-toolbar" style={{ marginBottom: 12, marginTop: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className={vista === "proximas" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setVista("proximas")}
          >
            Próximas a vencer ({sanas.length})
          </button>
          <button
            type="button"
            className={vista === "vencidas" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setVista("vencidas")}
          >
            Ya vencidas ({problema.length})
          </button>
          <button
            type="button"
            className={vista === "cobranzaMensual" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setVista("cobranzaMensual")}
          >
            Cobranza Mensual ({mensuales.length})
          </button>
        </div>
      </div>

      {vista === "proximas" && (
        <>
          <FilterBar>
            <div className="field">
              <label htmlFor="renovaciones-alcance">Alcance</label>
              <select
                id="renovaciones-alcance"
                value={alcance}
                onChange={(event) => setAlcance(event.target.value as Alcance)}
              >
                <option value="esteMes">Este mes calendario</option>
                <option value="mesEspecifico">Elegir un mes (incluye futuros)</option>
                <option value="ventana">Dentro de la ventana de aviso (según periodicidad)</option>
                <option value="todos">Todo el horizonte calculado</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="renovaciones-periodicidad">Periodicidad</label>
              <select
                id="renovaciones-periodicidad"
                value={periodicidadFiltro}
                onChange={(event) => setPeriodicidadFiltro(event.target.value as PeriodicidadFiltro)}
              >
                <option value="">Todas</option>
                <option value="MENSUAL">Mensual</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="SEMESTRAL">Semestral</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>
          </FilterBar>

          {alcance === "mesEspecifico" && (
            <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
              Mostrando <strong style={{ textTransform: "capitalize" }}>{mesFuturo.label}</strong> —
              usa los botones de "Mes anterior"/"Mes siguiente" del panel de arriba para cambiar
              de mes.
            </p>
          )}
        </>
      )}

      {error && <p className="error-text">{error}</p>}
      {data && data.data.length >= PAGE_SIZE && data.total > PAGE_SIZE && (
        <p className="muted" style={{ marginBottom: 12 }}>
          Hay más de {PAGE_SIZE} clientes en la cartera — esta pantalla solo trae los primeros{" "}
          {PAGE_SIZE}.
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <ExportButtons
          disabled={exportVistaActual.filas.length === 0}
          onExcel={() =>
            exportarExcel(exportVistaActual.nombreArchivo, exportVistaActual.columnas, exportVistaActual.filas)
          }
          onPdf={() =>
            exportarPdf(
              exportVistaActual.nombreArchivo,
              exportVistaActual.titulo,
              exportVistaActual.columnas,
              exportVistaActual.filas
            )
          }
        />
      </div>

      <div className="card">
        {vista === "proximas" && (
          <DataTable
            columns={columnasProximas(setClienteSeleccionado)}
            rows={filasProximas}
            rowKey={(c) => c.numeroDocumentoCliente}
            loading={loading}
            emptyMessage="No hay clientes con renovación sana en este alcance."
          />
        )}
        {vista === "vencidas" && (
          <DataTable
            columns={columnasVencidas(setClienteSeleccionado)}
            rows={filasVencidas}
            rowKey={(c) => c.numeroDocumentoCliente}
            loading={loading}
            sortBy="vencido"
            sortDir={ordenVencidas}
            onSortChange={() => setOrdenVencidas((o) => (o === "desc" ? "asc" : "desc"))}
            emptyMessage="No hay clientes vencidos — toda la cartera viene al día."
          />
        )}
        {vista === "cobranzaMensual" && (
          <DataTable
            columns={columnasCobranza}
            rows={mensuales}
            rowKey={(c) => c.numeroDocumentoCliente}
            loading={loading}
            emptyMessage="No hay clientes con plan mensual."
          />
        )}
      </div>

      {clienteSeleccionado && (
        <AccionesClienteDrawer
          key={clienteSeleccionado}
          numeroDocumentoCliente={clienteSeleccionado}
          onClose={() => setClienteSeleccionado(null)}
        />
      )}
    </div>
  );
}
