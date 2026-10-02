import { useEffect, useMemo, useState } from "react";
import { AccionesClienteDrawer } from "../components/panels/AccionesClienteDrawer";
import { ActionMenu, type ActionMenuItem } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { ClienteCell } from "../components/ui/ClienteCell";
import { CollapsibleCard } from "../components/ui/CollapsibleCard";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { Drawer } from "../components/ui/Drawer";
import { EmptyState } from "../components/ui/EmptyState";
import { ExportButtons } from "../components/ui/ExportButtons";
import { FilterBar } from "../components/ui/FilterBar";
import { KpiCard } from "../components/ui/KpiCard";
import { Pagination } from "../components/ui/Pagination";
import { SearchInput } from "../components/ui/SearchInput";
import { TareaForm, type TareaFormValues } from "../components/forms/TareaForm";
import { useAuth } from "../context/AuthContext";
import { useClientes } from "../hooks/useClientes";
import { useResumenBajas } from "../hooks/useResumenBajas";
import { createTarea } from "../services/tareas";
import type { Periodicidad, PostVentaCliente } from "../types/postventaCliente";
import { buildContactoMenuItems } from "../utils/contactoMenuItems";
import { exportarExcel, exportarPdf, type ExportColumn } from "../utils/exportTable";
import { formatCurrency, formatNumber } from "../utils/format";
import { CrearSeguimientoDialog } from "./clienteFicha/CrearSeguimientoDialog";
import { ClaseCobranzaBadge } from "./renovaciones/badges";
import {
  claseCobranzaMes,
  calcularResumenMensual,
  esProblema,
  fechaRelevante,
  mesRelativo,
  montoRealCiclo,
  PERIODICIDAD_LABEL,
  primerDiaMes,
  resumenAnclaPendiente,
  resumenDeudaArrastrada,
  resumenSinIngresos,
  segmentoListaCobranza,
  contarSinDato,
  textoDiasParaClase,
  ultimoDiaMes,
  type ClaseCobranzaMes,
  type MesInfo,
  type SegmentoListaCobranza,
} from "./renovaciones/proyeccion";
import "./Renovaciones.css";

const PAGE_SIZE = 5000;
const TABLA_PAGE_SIZE = 10;
const CICLOS_CONOCIDOS = [1, 12, 22];
type PeriodicidadFiltro = "" | Exclude<Periodicidad, "DESCONOCIDO">;
type Tab = "no_pagaron" | "ya_pagaron";

const ORDEN_CLASE: Record<ClaseCobranzaMes, number> = {
  vencido_este_mes: 0,
  vence_hoy: 1,
  proximo: 2,
  pagado: 3,
};

interface Fila {
  cliente: PostVentaCliente;
  clase: ClaseCobranzaMes;
}

interface FacetStats {
  count: number;
  monto: number;
}

function fmtFecha(d: Date): string {
  return d.toLocaleDateString("es-PE");
}

function compararFilas(a: Fila, b: Fila): number {
  if (a.clase !== b.clase) return ORDEN_CLASE[a.clase] - ORDEN_CLASE[b.clase];
  const fa = fechaRelevante(a.cliente);
  const fb = fechaRelevante(b.cliente);
  if (!fa && !fb) return 0;
  if (!fa) return 1;
  if (!fb) return -1;
  return fa.localeCompare(fb);
}

function fechaEsperadaTexto(cliente: PostVentaCliente): string {
  if (esProblema(cliente)) {
    return cliente.vencidoDesde ? `Vencido desde ${new Date(cliente.vencidoDesde).toLocaleDateString("es-PE")}` : "No determinado";
  }
  return cliente.proximaRenovacion ? new Date(cliente.proximaRenovacion).toLocaleDateString("es-PE") : "—";
}

function columnasCobranza(
  fechaCorte: Date,
  onAbrirAcciones: (numeroDocumentoCliente: string) => void,
  onCrearTarea: (fila: Fila) => void,
  onRegistrarSeguimiento: (fila: Fila) => void
): DataTableColumn<Fila>[] {
  return [
    {
      key: "acciones",
      label: "",
      align: "center",
      render: (f) => {
        const items: ActionMenuItem[] = [
          { key: "agendar", label: "Agendar / Interés", onSelect: () => onAbrirAcciones(f.cliente.numeroDocumentoCliente) },
          { key: "ficha", label: "Abrir ficha", to: `/clientes/${f.cliente.numeroDocumentoCliente}` },
          { key: "crear-tarea", label: "Crear tarea de renovación", onSelect: () => onCrearTarea(f) },
          ...buildContactoMenuItems({
            numeroDocumentoCliente: f.cliente.numeroDocumentoCliente,
            idOrdenServicio: f.cliente.ordenVigente.idOrdenServicio,
            telefonoLimpio: f.cliente.telefonoEfectivo,
          }),
          { key: "seguimiento", label: "Registrar seguimiento", onSelect: () => onRegistrarSeguimiento(f) },
          {
            key: "estado-renovacion",
            label: "Ver estado de renovación",
            to: `/clientes/${f.cliente.numeroDocumentoCliente}?tab=renovacion`,
          },
        ];
        return <ActionMenu label={`Acciones para ${f.cliente.nombreCliente}`} items={items} />;
      },
    },
    {
      key: "sistema",
      label: "Sistema / Orden",
      render: (f) => <span className="muted">{f.cliente.ordenVigente.numeroOs || "—"}</span>,
    },
    {
      key: "cliente",
      label: "Cliente / RUC",
      render: (f) => (
        <ClienteCell numeroDocumentoCliente={f.cliente.numeroDocumentoCliente} nombreCliente={f.cliente.nombreCliente} sistemas={f.cliente.sistemas} />
      ),
    },
    { key: "plan", label: "Plan", render: (f) => f.cliente.planActual.nombre || "—" },
    {
      key: "periodicidad",
      label: "Periodicidad",
      render: (f) =>
        f.cliente.planActual.periodicidad === "DESCONOCIDO" ? "—" : PERIODICIDAD_LABEL[f.cliente.planActual.periodicidad],
    },
    {
      key: "ciclo",
      label: "Ciclo",
      align: "center",
      render: (f) => (f.cliente.diaCicloMensual === null ? <span className="muted">—</span> : String(f.cliente.diaCicloMensual).padStart(2, "0")),
    },
    {
      key: "monto",
      label: "Monto",
      align: "right",
      render: (f) => formatCurrency(montoRealCiclo(f.cliente) ?? 0),
    },
    {
      key: "fecha",
      label: "Fecha esperada",
      render: (f) => fechaEsperadaTexto(f.cliente),
    },
    {
      key: "estado",
      label: "Estado",
      render: (f) => <ClaseCobranzaBadge clase={f.clase} />,
    },
    {
      key: "dias",
      label: "Días vencidos / restantes",
      render: (f) => textoDiasParaClase(f.cliente, f.clase, fechaCorte),
    },
  ];
}

const columnasExport: ExportColumn<Fila>[] = [
  { header: "Sistema/Orden", value: (f) => f.cliente.ordenVigente.numeroOs },
  { header: "Cliente", value: (f) => f.cliente.nombreCliente },
  { header: "RUC/DNI", value: (f) => f.cliente.numeroDocumentoCliente },
  { header: "Plan", value: (f) => f.cliente.planActual.nombre },
  {
    header: "Periodicidad",
    value: (f) => (f.cliente.planActual.periodicidad === "DESCONOCIDO" ? "" : PERIODICIDAD_LABEL[f.cliente.planActual.periodicidad]),
  },
  { header: "Ciclo", value: (f) => f.cliente.diaCicloMensual ?? "" },
  { header: "Monto", value: (f) => montoRealCiclo(f.cliente) ?? "" },
  { header: "Fecha esperada", value: (f) => fechaEsperadaTexto(f.cliente) },
  { header: "Estado", value: (f) => f.clase },
  { header: "Ejecutivo", value: (f) => f.cliente.ordenVigente.ejecutivo ?? "" },
];

function fechaInputValue(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

// Botonera con cifras — reemplaza los <select> de Periodicidad y Ciclo:
// cada boton muestra su propia cantidad + subtotal monetario (calculados
// sobre TODOS los demas filtros activos, menos este mismo — asi el numero
// que se ve es "cuantos tendria si elijo esta opcion"), y el estado activo
// con contraste real (no solo color).
function FacetButtons<T extends string>({
  ariaLabel,
  opciones,
  activo,
  onChange,
  facets,
}: {
  ariaLabel: string;
  opciones: { value: T; label: string }[];
  activo: T;
  onChange: (value: T) => void;
  facets: Map<T, FacetStats>;
}) {
  return (
    <div className="renovaciones-facet-grid" role="group" aria-label={ariaLabel}>
      {opciones.map((op) => {
        const stats = facets.get(op.value) ?? { count: 0, monto: 0 };
        return (
          <button
            key={op.value}
            type="button"
            className={activo === op.value ? "renovaciones-facet-boton activo" : "renovaciones-facet-boton"}
            aria-pressed={activo === op.value}
            onClick={() => onChange(op.value)}
          >
            <span className="renovaciones-facet-label">{op.label}</span>
            <span className="renovaciones-facet-count">{formatNumber(stats.count)}</span>
            <span className="renovaciones-facet-monto">{formatCurrency(stats.monto)}</span>
          </button>
        );
      })}
    </div>
  );
}

// Mini-tabla reutilizada por los 3 avisos secundarios "de cliente completo"
// (ancla pendiente, sin ingresos, deuda arrastrada) — misma forma que la de
// bajas, solo cambia que columna de "motivo" mostrar.
function MiniListaClientes({
  clientes,
  motivo,
  monto,
}: {
  clientes: PostVentaCliente[];
  motivo: (c: PostVentaCliente) => string;
  monto: (c: PostVentaCliente) => number;
}) {
  return (
    <DataTable
      columns={[
        {
          key: "cliente",
          label: "Cliente / RUC",
          render: (c: PostVentaCliente) => (
            <ClienteCell numeroDocumentoCliente={c.numeroDocumentoCliente} nombreCliente={c.nombreCliente} sistemas={c.sistemas} />
          ),
        },
        { key: "plan", label: "Plan", render: (c) => c.planActual.nombre || "—" },
        { key: "monto", label: "Monto", align: "right", render: (c) => formatCurrency(monto(c)) },
        { key: "motivo", label: "Motivo", render: (c) => <span className="muted">{motivo(c)}</span> },
        { key: "ejecutivo", label: "Ejecutivo", render: (c) => c.ordenVigente.ejecutivo ?? "—" },
      ]}
      rows={clientes}
      rowKey={(c) => c.numeroDocumentoCliente}
      emptyMessage="Sin clientes en esta condición."
    />
  );
}

const SEGMENTO_LABEL: Record<SegmentoListaCobranza, string> = {
  vencido_este_mes: "Vencidos este mes",
  vence_hoy: "Vence hoy",
  proximos_7_dias: "Próximos a vencer",
  resto_mes: "Resto del mes",
};

export function RenovacionesPage() {
  const { username } = useAuth();
  const { data, loading, error } = useClientes({ pageSize: PAGE_SIZE });
  const { data: bajas } = useResumenBajas();
  const todos = useMemo(() => data?.data ?? [], [data]);

  const [mesSeleccionado, setMesSeleccionado] = useState<MesInfo>(() => mesRelativo(new Date(), 0));
  const [diaCorte, setDiaCorte] = useState<number>(() => new Date().getDate());
  const ultimoDiaDelMes = ultimoDiaMes(mesSeleccionado).getDate();
  const diaCorteClamped = Math.min(diaCorte, ultimoDiaDelMes);
  const fechaCorte = useMemo(
    () => new Date(mesSeleccionado.anio, mesSeleccionado.mes, diaCorteClamped),
    [mesSeleccionado, diaCorteClamped]
  );
  const inicioMes = useMemo(() => primerDiaMes(mesSeleccionado), [mesSeleccionado]);
  const finMes = useMemo(() => ultimoDiaMes(mesSeleccionado), [mesSeleccionado]);

  function cambiarMes(offset: number) {
    setMesSeleccionado((prev) => mesRelativo(new Date(prev.anio, prev.mes, 1), offset));
  }
  function irAHoy() {
    const hoy = new Date();
    setMesSeleccionado(mesRelativo(hoy, 0));
    setDiaCorte(hoy.getDate());
  }

  const resumen = useMemo(() => calcularResumenMensual(todos, fechaCorte), [todos, fechaCorte]);
  const anclaPendiente = useMemo(() => resumenAnclaPendiente(todos), [todos]);
  const sinIngresos = useMemo(() => resumenSinIngresos(todos), [todos]);
  const deudaArrastrada = useMemo(() => resumenDeudaArrastrada(todos, inicioMes), [todos, inicioMes]);
  const sinDato = useMemo(() => contarSinDato(todos), [todos]);

  const [tab, setTab] = useState<Tab>("no_pagaron");
  const [segmentoFiltro, setSegmentoFiltro] = useState<SegmentoListaCobranza | "">("");
  const [busqueda, setBusqueda] = useState("");
  const [periodicidadFiltro, setPeriodicidadFiltro] = useState<PeriodicidadFiltro>("");
  const [cicloFiltro, setCicloFiltro] = useState<number | "">("");
  const [page, setPage] = useState(1);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [seguimientoFila, setSeguimientoFila] = useState<Fila | null>(null);
  const [anclaPendienteAbierto, setAnclaPendienteAbierto] = useState(false);
  const [sinIngresosAbierto, setSinIngresosAbierto] = useState(false);
  const [deudaArrastradaAbierto, setDeudaArrastradaAbierto] = useState(false);
  const [bajasAbierto, setBajasAbierto] = useState(false);

  const [tareaFilaActual, setTareaFilaActual] = useState<Fila | null>(null);
  const [tareaInicial, setTareaInicial] = useState<Partial<TareaFormValues>>({});
  const [savingTarea, setSavingTarea] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [mesSeleccionado.anio, mesSeleccionado.mes, diaCorteClamped, tab, segmentoFiltro, busqueda, periodicidadFiltro, cicloFiltro]);

  // Base sin periodicidad/ciclo (solo mes+corte+busqueda) — punto de partida
  // para calcular los facets de ambas botoneras de forma independiente.
  const baseSinPeriodicidadNiCiclo = useMemo(() => {
    let base: Fila[] = [];
    for (const cliente of todos) {
      const clase = claseCobranzaMes(cliente, fechaCorte, inicioMes, finMes);
      if (clase) base.push({ cliente, clase });
    }
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      base = base.filter(
        (f) => f.cliente.nombreCliente.toLowerCase().includes(q) || f.cliente.numeroDocumentoCliente.includes(q)
      );
    }
    return base;
  }, [todos, fechaCorte, inicioMes, finMes, busqueda]);

  // + pestaña (no_pagaron/ya_pagaron) + segmento — todavia sin periodicidad
  // ni ciclo, para que esas dos botoneras puedan calcularse una independiente
  // de la otra.
  const baseTab = useMemo(() => {
    let base =
      tab === "ya_pagaron"
        ? baseSinPeriodicidadNiCiclo.filter((f) => f.clase === "pagado")
        : baseSinPeriodicidadNiCiclo.filter((f) => f.clase !== "pagado");
    if (tab === "no_pagaron" && segmentoFiltro) {
      base = base.filter((f) => segmentoListaCobranza(f.cliente, f.clase, fechaCorte) === segmentoFiltro);
    }
    return base;
  }, [baseSinPeriodicidadNiCiclo, tab, segmentoFiltro, fechaCorte]);

  function acumularFacet(map: Map<string, FacetStats>, key: string, monto: number) {
    const cur = map.get(key) ?? { count: 0, monto: 0 };
    cur.count += 1;
    cur.monto += monto;
    map.set(key, cur);
  }

  // Facet de periodicidad: baseTab filtrada por CICLO (no por periodicidad) —
  // asi el boton "Trimestral" muestra cuantos habria si lo eligiera, dado el
  // ciclo ya elegido.
  const facetPeriodicidad = useMemo(() => {
    const base = cicloFiltro === "" ? baseTab : baseTab.filter((f) => f.cliente.diaCicloMensual === cicloFiltro);
    const map = new Map<PeriodicidadFiltro, FacetStats>();
    for (const f of base) {
      const monto = montoRealCiclo(f.cliente) ?? 0;
      acumularFacet(map, "", monto);
      if (f.cliente.planActual.periodicidad !== "DESCONOCIDO") acumularFacet(map, f.cliente.planActual.periodicidad, monto);
    }
    return map;
  }, [baseTab, cicloFiltro]);

  // Facet de ciclo: baseTab filtrada por PERIODICIDAD (no por ciclo).
  const facetCiclo = useMemo(() => {
    const base = periodicidadFiltro ? baseTab.filter((f) => f.cliente.planActual.periodicidad === periodicidadFiltro) : baseTab;
    const map = new Map<string, FacetStats>();
    for (const f of base) {
      const monto = montoRealCiclo(f.cliente) ?? 0;
      acumularFacet(map, "", monto);
      if (f.cliente.diaCicloMensual !== null) acumularFacet(map, String(f.cliente.diaCicloMensual), monto);
    }
    return map;
  }, [baseTab, periodicidadFiltro]);

  // Facet de segmento (dentro de "No pagaron"): igual patron, calculado
  // sobre periodicidad+ciclo ya elegidos pero sin el segmento mismo.
  const facetSegmento = useMemo(() => {
    const base =
      tab === "no_pagaron"
        ? baseSinPeriodicidadNiCiclo
            .filter((f) => f.clase !== "pagado")
            .filter((f) => !periodicidadFiltro || f.cliente.planActual.periodicidad === periodicidadFiltro)
            .filter((f) => cicloFiltro === "" || f.cliente.diaCicloMensual === cicloFiltro)
        : [];
    const map = new Map<SegmentoListaCobranza | "", FacetStats>();
    for (const f of base) {
      const monto = montoRealCiclo(f.cliente) ?? 0;
      acumularFacet(map, "", monto);
      const seg = segmentoListaCobranza(f.cliente, f.clase, fechaCorte);
      if (seg) acumularFacet(map, seg, monto);
    }
    return map;
  }, [baseSinPeriodicidadNiCiclo, tab, periodicidadFiltro, cicloFiltro, fechaCorte]);

  const totalNoPagaron = facetSegmento.get("")?.count ?? 0;
  const totalYaPagaron = useMemo(() => {
    return baseSinPeriodicidadNiCiclo
      .filter((f) => f.clase === "pagado")
      .filter((f) => !periodicidadFiltro || f.cliente.planActual.periodicidad === periodicidadFiltro)
      .filter((f) => cicloFiltro === "" || f.cliente.diaCicloMensual === cicloFiltro).length;
  }, [baseSinPeriodicidadNiCiclo, periodicidadFiltro, cicloFiltro]);

  // Filas realmente mostradas: baseTab + AMBOS filtros (periodicidad y ciclo).
  const filasTab = useMemo(() => {
    let base = baseTab;
    if (periodicidadFiltro) base = base.filter((f) => f.cliente.planActual.periodicidad === periodicidadFiltro);
    if (cicloFiltro !== "") base = base.filter((f) => f.cliente.diaCicloMensual === cicloFiltro);
    return [...base].sort(compararFilas);
  }, [baseTab, periodicidadFiltro, cicloFiltro]);

  const filasPagina = useMemo(
    () => filasTab.slice((page - 1) * TABLA_PAGE_SIZE, page * TABLA_PAGE_SIZE),
    [filasTab, page]
  );

  function handleCrearTareaDesdeFila(fila: Fila) {
    setTareaFilaActual(fila);
    setTareaInicial({
      titulo: `Gestionar cobranza: ${fila.cliente.nombreCliente}`,
      descripcion: `${fila.cliente.planActual.nombre || "Plan"} — ${fechaEsperadaTexto(fila.cliente)}.`,
      responsable: fila.cliente.ordenVigente.ejecutivo ?? username ?? "",
      prioridad: fila.clase === "vencido_este_mes" ? "ALTA" : "MEDIA",
      tipo: "COBRANZA",
    });
  }

  async function handleSubmitTarea(values: TareaFormValues) {
    if (!tareaFilaActual) return;
    setSavingTarea(true);
    try {
      await createTarea({
        numeroDocumentoCliente: tareaFilaActual.cliente.numeroDocumentoCliente,
        idOrdenServicio: tareaFilaActual.cliente.ordenVigente.idOrdenServicio,
        tipo: values.tipo,
        origen: "RENOVACION",
        origenEntidadTipo: "CLIENTE",
        origenEntidadId: tareaFilaActual.cliente.numeroDocumentoCliente,
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        responsable: values.responsable,
        prioridad: values.prioridad,
        fechaVencimiento: values.fechaVencimiento || null,
      });
      setTareaFilaActual(null);
    } finally {
      setSavingTarea(false);
    }
  }

  const columnas = useMemo(
    () => columnasCobranza(fechaCorte, setClienteSeleccionado, handleCrearTareaDesdeFila, setSeguimientoFila),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleCrearTareaDesdeFila solo lee username/setState, no necesita disparar un recalculo de columnas
    [fechaCorte]
  );

  function verListaAnclaPendiente() {
    setAnclaPendienteAbierto(true);
    document.getElementById("renovaciones-avisos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function verListaSinIngresos() {
    setSinIngresosAbierto(true);
    document.getElementById("renovaciones-avisos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function verListaDeudaArrastrada() {
    setDeudaArrastradaAbierto(true);
    document.getElementById("renovaciones-avisos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function verListaBajas() {
    setBajasAbierto(true);
    document.getElementById("renovaciones-avisos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Renovaciones</h1>
          <div className="page-header-subtitle">
            Cobranza del mes seleccionado — quién debe pagar y cuánto, al corte elegido.
          </div>
        </div>
      </div>

      <p className="muted renovaciones-trazabilidad">
        Origen: fechas y montos calculados a partir del ciclo de facturación y el último comprobante
        real emitido en APIWorking (sin proyección de precio: se asume el mismo monto del último
        ciclo).
        {data?.generatedAt && <> · Datos actualizados: {new Date(data.generatedAt).toLocaleString("es-PE")}</>}
      </p>

      {error && <p className="error-text">{error}</p>}

      {/* ---------------------------------------------------------------- */}
      {/* Mes seleccionado + fecha de corte                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="card renovaciones-selector">
        <div className="renovaciones-selector-row">
          <div className="renovaciones-mes-nav">
            <button type="button" className="btn btn-secondary" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
              ← Mes anterior
            </button>
            <strong style={{ textTransform: "capitalize", minWidth: 160, textAlign: "center" }}>{mesSeleccionado.label}</strong>
            <button type="button" className="btn btn-secondary" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
              Mes siguiente →
            </button>
          </div>
          <div className="field">
            <label htmlFor="renovaciones-fecha-corte">Fecha de corte (dentro del mes elegido)</label>
            <input
              id="renovaciones-fecha-corte"
              type="date"
              min={fechaInputValue(inicioMes)}
              max={fechaInputValue(finMes)}
              value={fechaInputValue(fechaCorte)}
              onChange={(event) => {
                const dia = Number(event.target.value.split("-")[2]);
                if (!Number.isNaN(dia)) setDiaCorte(dia);
              }}
            />
          </div>
          <button type="button" className="btn btn-ghost" onClick={irAHoy}>
            Hoy
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Resumen superior — 5 cifras, mismo mes+corte                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="card renovaciones-grupo">
        <h2>Cobranza de {mesSeleccionado.label}</h2>
        <div className="kpi-grid">
          <KpiCard
            label="Cobrado del mes"
            value={formatCurrency(resumen.cobradoDelMes.monto)}
            hint={`${formatNumber(resumen.cobradoDelMes.count)} cliente(s) con pago comparable a su renovación`}
            tone="success"
          />
          <KpiCard
            label={resumen.esCorteHoy ? "Vencen hoy" : `Vencen el ${fmtFecha(fechaCorte)}`}
            value={formatCurrency(resumen.venceHoy.monto)}
            hint={`${formatNumber(resumen.venceHoy.sistemas)} sistema(s) · ${formatNumber(resumen.venceHoy.count)} cliente(s)`}
          />
          <KpiCard
            label="Vencidos este mes"
            value={formatCurrency(resumen.vencidosEsteMes.monto)}
            hint={`${formatNumber(resumen.vencidosEsteMes.sistemas)} sistema(s) · ${formatNumber(resumen.vencidosEsteMes.count)} cliente(s) — antes del corte, sin pago`}
            tone={resumen.vencidosEsteMes.count > 0 ? "critical" : undefined}
          />
          <KpiCard
            label="Por cobrar del mes"
            value={formatCurrency(resumen.porCobrarDelMes.monto)}
            hint={`${formatNumber(resumen.porCobrarDelMes.sistemas)} sistema(s) · ${formatNumber(resumen.porCobrarDelMes.count)} cliente(s) — vencidas + hoy + próximas`}
            tone="warning"
          />
          <KpiCard
            label="Esperado total del mes"
            value={formatCurrency(resumen.esperadoTotalDelMes.monto)}
            hint={`Cobrado (${formatCurrency(resumen.cobradoDelMes.monto)}) + Por cobrar (${formatCurrency(resumen.porCobrarDelMes.monto)}) · ${formatNumber(resumen.esperadoTotalDelMes.count)} cliente(s)`}
          />
        </div>
        <p className="muted renovaciones-nota">
          Pagos generales del mes: {formatCurrency(resumen.pagosGeneralesDelMes)} — bruto, todos los
          comprobantes de renovación emitidos en el mes, informativo, nunca mezclado con "cobrado del
          mes".
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Avisos secundarios — nunca mezclados en el resumen de arriba      */}
      {/* ---------------------------------------------------------------- */}
      <div id="renovaciones-avisos">
        {(anclaPendiente.count > 0 || sinDato > 0) && (
          <div className="renovaciones-calidad-aviso">
            <Badge tone="pending">🔍 Calidad de datos</Badge>
            <span>
              {anclaPendiente.count > 0 && (
                <>
                  {formatNumber(anclaPendiente.count)} cliente(s) sin ancla confiable (ciclo pagado en
                  cuotas o sin comprobante de renovación real)
                  {anclaPendiente.monto > 0 && <> ({formatCurrency(anclaPendiente.monto)})</>}.{" "}
                  <button type="button" className="btn-link-inline" onClick={verListaAnclaPendiente}>
                    Ver lista
                  </button>
                </>
              )}
              {sinDato > 0 && <> · {formatNumber(sinDato)} cliente(s) sin periodicidad o comprobante histórico.</>}
            </span>
          </div>
        )}

        {sinIngresos.count > 0 && (
          <div className="renovaciones-calidad-aviso">
            <Badge tone="pending">⚪ Estado sin ingresos</Badge>
            <span>
              {formatNumber(sinIngresos.count)} cliente(s) en estado demo/inactivo/pendiente de
              activación — no se sabe si generarán ingreso
              {sinIngresos.monto > 0 && <> (deuda actual: {formatCurrency(sinIngresos.monto)})</>}.{" "}
              <button type="button" className="btn-link-inline" onClick={verListaSinIngresos}>
                Ver lista
              </button>
            </span>
          </div>
        )}

        {deudaArrastrada.count > 0 && (
          <div className="renovaciones-calidad-aviso">
            <Badge tone="critical">⏳ Deuda arrastrada</Badge>
            <span>
              {formatNumber(deudaArrastrada.sistemas)} sistema(s) · {formatNumber(deudaArrastrada.count)}{" "}
              cliente(s) vencidos de <strong>meses anteriores</strong> a {mesSeleccionado.label} (
              {formatCurrency(deudaArrastrada.monto)}) — nunca mezclada con "vencidos este mes".{" "}
              <button type="button" className="btn-link-inline" onClick={verListaDeudaArrastrada}>
                Ver lista
              </button>
            </span>
          </div>
        )}

        {bajas && bajas.excluidosPorFaltaDePago.count > 0 && (
          <div className="renovaciones-calidad-aviso">
            <Badge tone="pending">🚪 Bajas excluidas</Badge>
            <span>
              {formatNumber(bajas.excluidosPorFaltaDePago.count)} cliente(s) dados de baja hace más de{" "}
              {bajas.umbralDias} días con deuda pendiente ({formatCurrency(bajas.excluidosPorFaltaDePago.monto)}
              ) — posible falta de pago, pero el sistema no registra un motivo de baja confirmado
              (pendiente de validación).{" "}
              <button type="button" className="btn-link-inline" onClick={verListaBajas}>
                Ver lista
              </button>
            </span>
          </div>
        )}

        {anclaPendiente.count > 0 && (
          <CollapsibleCard
            titulo="Ciclos sin ancla confiable"
            abierto={anclaPendienteAbierto}
            onToggle={() => setAnclaPendienteAbierto((v) => !v)}
            contador={anclaPendiente.count}
            tone="pending"
          >
            <MiniListaClientes
              clientes={anclaPendiente.clientes}
              monto={(c) => montoRealCiclo(c) ?? 0}
              motivo={() => "Sin comprobante de renovación real — ancla no confirmada"}
            />
          </CollapsibleCard>
        )}

        {sinIngresos.count > 0 && (
          <CollapsibleCard
            titulo="Clientes en estado sin ingresos"
            abierto={sinIngresosAbierto}
            onToggle={() => setSinIngresosAbierto((v) => !v)}
            contador={sinIngresos.count}
            tone="pending"
          >
            <MiniListaClientes
              clientes={sinIngresos.clientes}
              monto={(c) => c.deudaTotal}
              motivo={(c) => c.ordenVigente.nEstadoApiWorking}
            />
          </CollapsibleCard>
        )}

        {deudaArrastrada.count > 0 && (
          <CollapsibleCard
            titulo="Deuda arrastrada de meses anteriores"
            abierto={deudaArrastradaAbierto}
            onToggle={() => setDeudaArrastradaAbierto((v) => !v)}
            contador={deudaArrastrada.count}
            tone="critical"
          >
            <MiniListaClientes
              clientes={deudaArrastrada.clientes}
              monto={(c) => montoRealCiclo(c) ?? 0}
              motivo={(c) => (c.vencidoDesde ? `Vencido desde ${new Date(c.vencidoDesde).toLocaleDateString("es-PE")}` : "Vencido")}
            />
          </CollapsibleCard>
        )}

        {bajas && bajas.excluidosPorFaltaDePago.count > 0 && (
          <CollapsibleCard
            titulo="Bajas con deuda pendiente (excluidas de la proyección)"
            subtitulo="Motivo de baja no registrado en el sistema — no se afirma 'falta de pago', es un indicio por deuda pendiente"
            abierto={bajasAbierto}
            onToggle={() => setBajasAbierto((v) => !v)}
            contador={bajas.excluidosPorFaltaDePago.count}
            tone="pending"
          >
            <DataTable
              columns={[
                {
                  key: "cliente",
                  label: "Cliente / RUC",
                  render: (c: (typeof bajas.excluidosPorFaltaDePago.clientes)[number]) => (
                    <ClienteCell numeroDocumentoCliente={c.numeroDocumentoCliente} nombreCliente={c.nombreCliente} sistemas={c.sistemas} />
                  ),
                },
                { key: "plan", label: "Plan", render: (c) => c.planActual.nombre || "—" },
                { key: "deuda", label: "Deuda actual", align: "right", render: (c) => formatCurrency(c.deudaTotal) },
                {
                  key: "fechaBaja",
                  label: "Dado de baja",
                  render: (c) => (c.fechaBaja ? new Date(c.fechaBaja).toLocaleDateString("es-PE") : "—"),
                },
                { key: "ejecutivo", label: "Ejecutivo", render: (c) => c.ejecutivo ?? "—" },
              ]}
              rows={bajas.excluidosPorFaltaDePago.clientes}
              rowKey={(c) => c.numeroDocumentoCliente}
              emptyMessage="Sin clientes en esta condición."
            />
          </CollapsibleCard>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Lista de cobranza                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section id="renovaciones-tabla">
        <h2>Lista de cobranza</h2>

        <div className="segmented-control renovaciones-tabs" role="tablist" aria-label="Estado de pago">
          <button type="button" role="tab" aria-selected={tab === "no_pagaron"} className={tab === "no_pagaron" ? "activo" : ""} onClick={() => setTab("no_pagaron")}>
            No pagaron ({formatNumber(totalNoPagaron)})
          </button>
          <button type="button" role="tab" aria-selected={tab === "ya_pagaron"} className={tab === "ya_pagaron" ? "activo" : ""} onClick={() => setTab("ya_pagaron")}>
            Ya pagaron ({formatNumber(totalYaPagaron)})
          </button>
        </div>

        {tab === "no_pagaron" && (
          <FacetButtons
            ariaLabel="Filtro por estado de vencimiento"
            activo={segmentoFiltro}
            onChange={setSegmentoFiltro}
            facets={facetSegmento}
            opciones={[
              { value: "", label: "Todos" },
              { value: "vencido_este_mes", label: SEGMENTO_LABEL.vencido_este_mes },
              { value: "vence_hoy", label: SEGMENTO_LABEL.vence_hoy },
              { value: "proximos_7_dias", label: SEGMENTO_LABEL.proximos_7_dias },
              { value: "resto_mes", label: SEGMENTO_LABEL.resto_mes },
            ]}
          />
        )}

        <FilterBar>
          <div className="field">
            <label htmlFor="renovaciones-busqueda">Cliente o RUC</label>
            <SearchInput id="renovaciones-busqueda" value={busqueda} onChange={setBusqueda} placeholder="Buscar..." />
          </div>
        </FilterBar>

        <div className="field renovaciones-facet-field">
          <span className="renovaciones-facet-titulo">Periodicidad</span>
          <FacetButtons
            ariaLabel="Filtro por periodicidad"
            activo={periodicidadFiltro}
            onChange={setPeriodicidadFiltro}
            facets={facetPeriodicidad}
            opciones={[
              { value: "", label: "Todas" },
              { value: "MENSUAL", label: "Mensual" },
              { value: "TRIMESTRAL", label: "Trimestral" },
              { value: "SEMESTRAL", label: "Semestral" },
              { value: "ANUAL", label: "Anual" },
            ]}
          />
        </div>

        <div className="field renovaciones-facet-field">
          <span className="renovaciones-facet-titulo">Ciclo mensual</span>
          <FacetButtons
            ariaLabel="Filtro por ciclo mensual"
            activo={cicloFiltro === "" ? "" : String(cicloFiltro)}
            onChange={(v) => setCicloFiltro(v === "" ? "" : Number(v))}
            facets={facetCiclo}
            opciones={[
              { value: "", label: "Todos" },
              ...CICLOS_CONOCIDOS.map((c) => ({ value: String(c), label: String(c).padStart(2, "0") })),
            ]}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <ExportButtons
            disabled={filasTab.length === 0}
            onExcel={() => exportarExcel("renovaciones", columnasExport, filasTab)}
            onPdf={() => exportarPdf("renovaciones", "Renovaciones — Lista de cobranza", columnasExport, filasTab)}
          />
        </div>

        <div className="card">
          <DataTable
            columns={columnas}
            rows={filasPagina}
            rowKey={(f) => f.cliente.numeroDocumentoCliente}
            loading={loading}
            emptyMessage="No hay clientes para este filtro."
            stickyFirstColumn
          />
        </div>

        {filasTab.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Pagination page={page} pageSize={TABLA_PAGE_SIZE} total={filasTab.length} onPageChange={setPage} itemLabel="cliente(s)" />
          </div>
        )}

        {!loading && filasTab.length === 0 && todos.length === 0 && <EmptyState title="Sin datos de clientes todavía" />}
      </section>

      {clienteSeleccionado && (
        <AccionesClienteDrawer
          key={clienteSeleccionado}
          numeroDocumentoCliente={clienteSeleccionado}
          origen={{ modulo: "RENOVACIONES", etiqueta: "Renovaciones", entidadTipo: "CLIENTE", entidadId: clienteSeleccionado }}
          onClose={() => setClienteSeleccionado(null)}
        />
      )}

      {seguimientoFila && (
        <CrearSeguimientoDialog
          numeroDocumentoCliente={seguimientoFila.cliente.numeroDocumentoCliente}
          onClose={() => setSeguimientoFila(null)}
          onCreado={() => setSeguimientoFila(null)}
        />
      )}

      <Drawer
        open={tareaFilaActual !== null}
        onClose={() => setTareaFilaActual(null)}
        title={tareaFilaActual ? `Tarea — ${tareaFilaActual.cliente.nombreCliente}` : "Nueva tarea"}
      >
        <TareaForm
          key={tareaFilaActual?.cliente.numeroDocumentoCliente ?? "closed"}
          initial={tareaInicial}
          onSubmit={handleSubmitTarea}
          onCancel={() => setTareaFilaActual(null)}
          submitting={savingTarea}
        />
      </Drawer>
    </div>
  );
}
