import { useEffect, useMemo, useState } from "react";
import { AccionesClienteDrawer } from "../components/panels/AccionesClienteDrawer";
import { ActionMenu, type ActionMenuItem } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { ClienteCell } from "../components/ui/ClienteCell";
import { CollapsibleCard } from "../components/ui/CollapsibleCard";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { FilterBar } from "../components/ui/FilterBar";
import { Pagination } from "../components/ui/Pagination";
import { SearchInput } from "../components/ui/SearchInput";
import { EstadoTareaPill, OrigenTareaBadge, PrioridadTareaPill, TipoTareaPill } from "../components/ui/StatusPill";
import { useClientes } from "../hooks/useClientes";
import { useTareas } from "../hooks/useTareas";
import { useTareasRenovacion } from "../hooks/useTareasRenovacion";
import { updateTarea } from "../services/tareas";
import type {
  OrigenTarea,
  Periodicidad,
  PostVentaCliente,
  PrioridadTarea,
  Tarea,
  TareaListItem,
  TareaRenovacion,
  TipoTarea,
} from "../types/postventaCliente";
import { ORIGEN_TAREA_LABEL, TIPO_TAREA_LABEL } from "../utils/tareaLabels";
import { CarteraMensualPanel } from "./tareas/CarteraMensualPanel";
import { TareaDetalleDrawer } from "./tareas/TareaDetalleDrawer";
import { esAbierta, esVencida, hoyIso, ORDEN_TIPOS, postergarFecha, prioridadVistaDiaria } from "./tareas/helpers";
import "./Tareas.css";

const PAGE_SIZE_TABLA = 10;
// "en_seguimiento" reusa el estado EN_PROCESO ya existente en el modelo de
// Tarea (label "En seguimiento" en toda la UI, ver tareaLabels.ts) — no es
// un estado nuevo en la base de datos, solo una pestaña nueva que lo separa
// de "Pendientes" (pedido explicito).
type Tab = "pendientes" | "en_seguimiento" | "completadas";

function truncar(texto: string | null, max: number): string {
  if (!texto) return "—";
  return texto.length > max ? `${texto.slice(0, max).trimEnd()}…` : texto;
}

// A donde manda "Ver alerta/incidencia/origen relacionado" segun el origen
// real de la tarea — reusa vistas de solo lectura ya existentes (Alertas
// filtrado por cliente, o la pestaña correspondiente de la ficha), sin
// inventar ningun endpoint ni vista nueva. MANUAL/FICHA_CLIENTE/
// REPARTO_MENSUAL no tienen una entidad puntual que enlazar.
function buildOrigenLink(t: TareaListItem): { to: string; label: string } | null {
  switch (t.origen) {
    case "ALERTA":
      return { to: `/alertas?cliente=${t.numeroDocumentoCliente}`, label: "Ver alerta relacionada" };
    case "INCIDENCIA":
      return { to: `/clientes/${t.numeroDocumentoCliente}?tab=incidencias`, label: "Ver incidencia relacionada" };
    case "OPORTUNIDAD":
      return { to: `/clientes/${t.numeroDocumentoCliente}?tab=oportunidades`, label: "Ver oportunidad relacionada" };
    case "RENOVACION":
      return { to: `/clientes/${t.numeroDocumentoCliente}?tab=renovacion`, label: "Ver renovación relacionada" };
    case "RECUPERACION":
      return { to: `/recuperacion?cliente=${t.numeroDocumentoCliente}`, label: "Ver episodio de recuperación" };
    default:
      return null;
  }
}

// "Reasignar" no se duplica como item de un click aca — es un mini
// formulario inline (ReasignarAction), no una accion instantanea; sigue
// disponible dentro de "Abrir detalle" (TareaDetalleDrawer ya lo contiene).
function buildTareaMenuItems(
  t: TareaListItem,
  handlers: {
    onAgendar: (tarea: TareaListItem) => void;
    onVerDetalle: (tarea: TareaListItem) => void;
    onCompletar: (tarea: Tarea) => void;
    onPostergar: (tarea: Tarea) => void;
    onMarcarSeguimiento: (tarea: Tarea) => void;
  }
): ActionMenuItem[] {
  const items: ActionMenuItem[] = [
    { key: "agendar", label: "Agendar / Interés", onSelect: () => handlers.onAgendar(t) },
    { key: "detalle", label: "Abrir detalle", onSelect: () => handlers.onVerDetalle(t) },
  ];
  if (esAbierta(t)) {
    items.push({ key: "completar", label: "Completar", onSelect: () => handlers.onCompletar(t) });
    if (t.estado !== "EN_PROCESO") {
      items.push({
        key: "seguimiento",
        label: "Marcar en seguimiento",
        onSelect: () => handlers.onMarcarSeguimiento(t),
      });
    }
    items.push({ key: "postergar", label: "Postergar 3 días", onSelect: () => handlers.onPostergar(t) });
  }
  items.push({ key: "ficha", label: "Abrir ficha", to: `/clientes/${t.numeroDocumentoCliente}` });
  const origenLink = buildOrigenLink(t);
  if (origenLink) items.push({ key: "origen", label: origenLink.label, to: origenLink.to });
  return items;
}

function buildColumns(
  clientesPorDocumento: Map<string, PostVentaCliente>,
  menuHandlers: {
    onAgendar: (tarea: TareaListItem) => void;
    onVerDetalle: (tarea: TareaListItem) => void;
    onCompletar: (tarea: Tarea) => void;
    onPostergar: (tarea: Tarea) => void;
    onMarcarSeguimiento: (tarea: Tarea) => void;
  }
): DataTableColumn<TareaListItem>[] {
  return [
    {
      key: "acciones",
      label: "",
      align: "center",
      render: (t) => (
        <ActionMenu label={`Acciones para tarea: ${t.titulo}`} items={buildTareaMenuItems(t, menuHandlers)} />
      ),
    },
    { key: "titulo", label: "Tarea", render: (t) => <strong>{t.titulo}</strong> },
    {
      key: "cliente",
      label: "Cliente",
      render: (t) => {
        const cliente = clientesPorDocumento.get(t.numeroDocumentoCliente);
        return cliente ? (
          <ClienteCell numeroDocumentoCliente={cliente.numeroDocumentoCliente} nombreCliente={cliente.nombreCliente} sistemas={cliente.sistemas} />
        ) : (
          <span className="mono">{t.numeroDocumentoCliente}</span>
        );
      },
    },
    { key: "descripcion", label: "Descripción", render: (t) => <span className="muted">{truncar(t.descripcion, 60)}</span> },
    { key: "vencimiento", label: "Fecha", render: (t) => t.fechaVencimiento ?? "Sin fecha" },
    { key: "tipo", label: "Tipo", render: (t) => <TipoTareaPill tipo={t.tipo} /> },
    { key: "origen", label: "Origen", render: (t) => <OrigenTareaBadge origen={t.origen} /> },
    { key: "prioridad", label: "Prioridad", render: (t) => <PrioridadTareaPill prioridad={t.prioridad} /> },
    { key: "estado", label: "Estado", render: (t) => <EstadoTareaPill estado={t.estado} /> },
  ];
}

// ---------------------------------------------------------------------------
// Panel de tareas de renovacion — generadas automaticamente por el backend
// (sincronizarTareasRenovacion) para todo cliente en ventana de renovacion,
// una tarea abierta a la vez. Sin cambios de fondo — sigue siendo su propio
// panel especializado, separado de la lista general de abajo.
// ---------------------------------------------------------------------------
type FiltroContacto = "todos" | "contactados" | "noContactados";

function TareasRenovacionPanel() {
  const { data, loading, error, refetch } = useTareasRenovacion();
  const [abierto, setAbierto] = useState(false);
  const [periodicidad, setPeriodicidad] = useState<Periodicidad | "">("");
  const [filtroContacto, setFiltroContacto] = useState<FiltroContacto>("todos");
  const [ordenIngresos, setOrdenIngresos] = useState<"asc" | "desc" | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [marcandoId, setMarcandoId] = useState<number | null>(null);

  const PERIODICIDADES: { value: Periodicidad; label: string }[] = [
    { value: "MENSUAL", label: "Mensual" },
    { value: "TRIMESTRAL", label: "Trimestral" },
    { value: "SEMESTRAL", label: "Semestral" },
    { value: "ANUAL", label: "Anual" },
  ];

  const filas = useMemo(() => {
    let filas = data ?? [];
    if (periodicidad) filas = filas.filter((f) => f.cliente.periodicidad === periodicidad);
    if (filtroContacto === "contactados") {
      filas = filas.filter((f) => f.tarea.estado === "COMPLETADA");
    } else if (filtroContacto === "noContactados") {
      filas = filas.filter((f) => f.tarea.estado !== "COMPLETADA");
    }
    if (ordenIngresos) {
      const dir = ordenIngresos === "asc" ? 1 : -1;
      filas = [...filas].sort(
        (a, b) => dir * ((a.cliente.ingresoMensualReal ?? -1) - (b.cliente.ingresoMensualReal ?? -1))
      );
    }
    return filas;
  }, [data, periodicidad, filtroContacto, ordenIngresos]);

  async function handleContactar(tarea: Tarea) {
    setMarcandoId(tarea.id);
    try {
      await updateTarea(tarea.id, { estado: "COMPLETADA" });
      refetch();
    } finally {
      setMarcandoId(null);
    }
  }

  async function handleRevertirContacto(tarea: Tarea) {
    setMarcandoId(tarea.id);
    try {
      await updateTarea(tarea.id, { estado: "PENDIENTE" });
      refetch();
    } finally {
      setMarcandoId(null);
    }
  }

  const columnasRenovacion: DataTableColumn<TareaRenovacion>[] = [
    {
      key: "acciones",
      label: "",
      align: "center",
      render: (f) => {
        const items: ActionMenuItem[] = [
          {
            key: "agendar",
            label: "Agendar / Interés",
            onSelect: () => setClienteSeleccionado(f.cliente.numeroDocumentoCliente),
          },
          f.tarea.estado === "COMPLETADA"
            ? {
                key: "contactar",
                label: "Marcar no contactado",
                disabled: marcandoId === f.tarea.id,
                onSelect: () => handleRevertirContacto(f.tarea),
              }
            : f.tarea.estado === "CANCELADA"
              ? { key: "contactar", label: "Contactar", disabled: true }
              : {
                  key: "contactar",
                  label: "Contactar",
                  disabled: marcandoId === f.tarea.id,
                  onSelect: () => handleContactar(f.tarea),
                },
        ];
        return <ActionMenu label={`Acciones para ${f.cliente.nombreCliente}`} items={items} />;
      },
    },
    {
      key: "cliente",
      label: "Cliente",
      render: (f) => (
        <ClienteCell numeroDocumentoCliente={f.cliente.numeroDocumentoCliente} nombreCliente={f.cliente.nombreCliente} sistemas={f.cliente.sistemas} />
      ),
    },
    { key: "periodicidad", label: "Periodicidad", render: (f) => f.cliente.periodicidad },
    {
      key: "renovacion",
      label: "Renovación",
      align: "right",
      render: (f) => {
        const dias = f.cliente.diasParaRenovacion;
        if (dias === null) return <span className="muted">—</span>;
        if (dias < 0) return <Badge tone="critical">Vencida</Badge>;
        return <Badge tone={dias <= 7 ? "warning" : "neutral"}>{dias} día(s)</Badge>;
      },
    },
    {
      key: "ingresos",
      label: "Ingresos mensuales",
      align: "right",
      sortable: true,
      render: (f) => (f.cliente.ingresoMensualReal == null ? "—" : new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(f.cliente.ingresoMensualReal)),
    },
    {
      key: "estado",
      label: "Estado",
      render: (f) =>
        f.tarea.estado === "COMPLETADA" ? (
          <Badge tone="success">Contactado</Badge>
        ) : f.tarea.estado === "CANCELADA" ? (
          <Badge tone="critical">Cancelada</Badge>
        ) : (
          <Badge tone="warning">Pendiente</Badge>
        ),
    },
  ];

  return (
    <CollapsibleCard titulo="Por renovar — contactar" abierto={abierto} onToggle={() => setAbierto((v) => !v)} contador={filas.length} tone="warning">
      <p className="muted">
        Clientes que entraron a la ventana de renovación (mismo criterio que la alerta "Renovación
        próxima") — se generan solos, sin que nadie tenga que crearlos a mano.
      </p>
      <div className="toolbar-row">
        <button type="button" className={periodicidad === "" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setPeriodicidad("")}>
          Todas
        </button>
        {PERIODICIDADES.map((p) => (
          <button key={p.value} type="button" className={periodicidad === p.value ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setPeriodicidad(p.value)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="toolbar-row" style={{ marginTop: 8 }}>
        <button type="button" className={filtroContacto === "todos" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setFiltroContacto("todos")}>
          Todos
        </button>
        <button type="button" className={filtroContacto === "noContactados" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setFiltroContacto("noContactados")}>
          No contactados
        </button>
        <button type="button" className={filtroContacto === "contactados" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setFiltroContacto("contactados")}>
          Contactados
        </button>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}
      <DataTable
        columns={columnasRenovacion}
        rows={filas}
        rowKey={(f) => f.tarea.id}
        loading={loading}
        sortBy={ordenIngresos ? "ingresos" : undefined}
        sortDir={ordenIngresos ?? undefined}
        onSortChange={(key) => {
          if (key !== "ingresos") return;
          setOrdenIngresos((actual) => (actual === null ? "desc" : actual === "desc" ? "asc" : null));
        }}
        emptyMessage="Sin clientes por renovar en este momento."
        stickyFirstColumn
      />
      {clienteSeleccionado && (
        <AccionesClienteDrawer
          key={clienteSeleccionado}
          numeroDocumentoCliente={clienteSeleccionado}
          origen={{ modulo: "TAREAS", etiqueta: "Renovaciones por contactar", entidadTipo: "CLIENTE", entidadId: clienteSeleccionado }}
          onClose={() => setClienteSeleccionado(null)}
        />
      )}
    </CollapsibleCard>
  );
}

// Sin filtro de "solo con incidencia" en el backend — se trae toda la
// cartera con pageSize grande (mismo patron que Renovaciones.tsx) solo para
// cruzar nombre/sistemas por numeroDocumentoCliente, no para listar clientes
// aca.
const CLIENTES_PAGE_SIZE = 5000;

export function TareasPage() {
  const { data, loading, error, refetch } = useTareas({});
  const { data: clientesData } = useClientes({ pageSize: CLIENTES_PAGE_SIZE });
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  const [tab, setTab] = useState<Tab>("pendientes");
  const [soloHoyYVencidas, setSoloHoyYVencidas] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoTarea | "">("");
  const [responsableFiltro, setResponsableFiltro] = useState("");
  const [prioridadFiltro, setPrioridadFiltro] = useState<PrioridadTarea | "">("");
  const [origenFiltro, setOrigenFiltro] = useState<OrigenTarea | "">("");
  const [page, setPage] = useState(1);

  const [tareaDetalle, setTareaDetalle] = useState<TareaListItem | null>(null);
  const [agendarTarea, setAgendarTarea] = useState<TareaListItem | null>(null);

  const clientesPorDocumento = useMemo(() => {
    const mapa = new Map<string, PostVentaCliente>();
    for (const c of clientesData?.data ?? []) mapa.set(c.numeroDocumentoCliente, c);
    return mapa;
  }, [clientesData]);

  async function handleCompletar(tarea: Tarea) {
    setProcesandoId(tarea.id);
    try {
      await updateTarea(tarea.id, { estado: "COMPLETADA" });
      refetch();
    } finally {
      setProcesandoId(null);
    }
  }

  async function handlePostergar(tarea: Tarea) {
    setProcesandoId(tarea.id);
    try {
      await updateTarea(tarea.id, { fechaVencimiento: postergarFecha(tarea.fechaVencimiento, 3) });
      refetch();
    } finally {
      setProcesandoId(null);
    }
  }

  async function handleMarcarSeguimiento(tarea: Tarea) {
    setProcesandoId(tarea.id);
    try {
      await updateTarea(tarea.id, { estado: "EN_PROCESO" });
      refetch();
    } finally {
      setProcesandoId(null);
    }
  }

  function cerrarDetalle() {
    setTareaDetalle(null);
  }

  function abrirDetalle(tarea: TareaListItem) {
    setTareaDetalle(tarea);
  }

  const columns = useMemo(
    () =>
      buildColumns(clientesPorDocumento, {
        onAgendar: setAgendarTarea,
        onVerDetalle: abrirDetalle,
        onCompletar: handleCompletar,
        onPostergar: handlePostergar,
        onMarcarSeguimiento: handleMarcarSeguimiento,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- los handlers solo leen closures estables, no necesitan disparar un recalculo de columnas
    [clientesPorDocumento]
  );

  const hoy = hoyIso();
  // Reparto mensual vive en su propio panel ("Cartera mensual", ver abajo) —
  // nunca se mezcla con Pendientes/En seguimiento/Completadas: son 1300+
  // contactos rutinarios que tapaban el trabajo real (ver feedback).
  const todas = useMemo(() => (data ?? []).filter((t) => t.origen !== "REPARTO_MENSUAL"), [data]);
  const responsables = useMemo(() => [...new Set(todas.map((t) => t.responsable))].sort((a, b) => a.localeCompare(b)), [todas]);

  const filasFiltradas = useMemo(() => {
    let base =
      tab === "completadas"
        ? todas.filter((t) => !esAbierta(t))
        : tab === "en_seguimiento"
          ? todas.filter((t) => t.estado === "EN_PROCESO")
          : todas.filter((t) => esAbierta(t) && t.estado !== "EN_PROCESO");
    if (tab !== "completadas" && soloHoyYVencidas) {
      base = base.filter((t) => t.fechaVencimiento === null || t.fechaVencimiento <= hoy);
    }
    if (tipoFiltro) base = base.filter((t) => t.tipo === tipoFiltro);
    if (responsableFiltro) base = base.filter((t) => t.responsable === responsableFiltro);
    if (prioridadFiltro) base = base.filter((t) => t.prioridad === prioridadFiltro);
    if (origenFiltro) base = base.filter((t) => t.origen === origenFiltro);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      base = base.filter((t) => {
        const cliente = clientesPorDocumento.get(t.numeroDocumentoCliente);
        return t.numeroDocumentoCliente.toLowerCase().includes(q) || (cliente?.nombreCliente.toLowerCase().includes(q) ?? false);
      });
    }
    return [...base].sort((a, b) => {
      // Orden de urgencia primero (incidencias abiertas > alertas criticas >
      // cobranza vencida > cualquier otra vencida > resto — pedido
      // explicito), despues vencidas antes que no vencidas dentro del mismo
      // bucket, despues por fecha ascendente, sin fecha al final.
      const prioridadA = prioridadVistaDiaria(a, hoy);
      const prioridadB = prioridadVistaDiaria(b, hoy);
      if (prioridadA !== prioridadB) return prioridadA - prioridadB;
      const aVencida = esVencida(a, hoy);
      const bVencida = esVencida(b, hoy);
      if (aVencida !== bVencida) return aVencida ? -1 : 1;
      if (a.fechaVencimiento === null && b.fechaVencimiento === null) return 0;
      if (a.fechaVencimiento === null) return 1;
      if (b.fechaVencimiento === null) return -1;
      return a.fechaVencimiento.localeCompare(b.fechaVencimiento);
    });
  }, [todas, tab, soloHoyYVencidas, tipoFiltro, responsableFiltro, prioridadFiltro, origenFiltro, busqueda, clientesPorDocumento, hoy]);

  useEffect(() => {
    setPage(1);
  }, [tab, soloHoyYVencidas, tipoFiltro, responsableFiltro, prioridadFiltro, origenFiltro, busqueda]);

  const filasPagina = filasFiltradas.slice((page - 1) * PAGE_SIZE_TABLA, page * PAGE_SIZE_TABLA);

  const totalPendientes = useMemo(
    () => todas.filter((t) => esAbierta(t) && t.estado !== "EN_PROCESO").length,
    [todas]
  );
  const totalEnSeguimiento = useMemo(() => todas.filter((t) => t.estado === "EN_PROCESO").length, [todas]);
  const totalCompletadas = useMemo(() => todas.filter((t) => !esAbierta(t)).length, [todas]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tareas</h1>
          <div className="page-header-subtitle">Lista de tareas accionables de Post Venta</div>
        </div>
      </div>

      <TareasRenovacionPanel />
      <CarteraMensualPanel />

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      <div className="segmented-control tareas-vista-tabs" role="tablist" aria-label="Estado de las tareas">
        <button type="button" role="tab" aria-selected={tab === "pendientes"} className={tab === "pendientes" ? "activo" : ""} onClick={() => setTab("pendientes")}>
          Pendientes ({totalPendientes})
        </button>
        <button type="button" role="tab" aria-selected={tab === "en_seguimiento"} className={tab === "en_seguimiento" ? "activo" : ""} onClick={() => setTab("en_seguimiento")}>
          En seguimiento ({totalEnSeguimiento})
        </button>
        <button type="button" role="tab" aria-selected={tab === "completadas"} className={tab === "completadas" ? "activo" : ""} onClick={() => setTab("completadas")}>
          Completadas ({totalCompletadas})
        </button>
      </div>

      {tab !== "completadas" && (
        <label className="tareas-checkbox-filtro">
          <input type="checkbox" checked={soloHoyYVencidas} onChange={(event) => setSoloHoyYVencidas(event.target.checked)} />
          Mostrar solo hoy y vencidas (vista por defecto)
        </label>
      )}

      <FilterBar>
        <div className="field">
          <label htmlFor="tareas-busqueda">Cliente o RUC</label>
          <SearchInput id="tareas-busqueda" value={busqueda} onChange={setBusqueda} placeholder="Buscar..." />
        </div>
        <div className="field">
          <label htmlFor="tareas-tipo">Tipo</label>
          <select id="tareas-tipo" value={tipoFiltro} onChange={(event) => setTipoFiltro(event.target.value as TipoTarea | "")}>
            <option value="">Todos</option>
            {ORDEN_TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {TIPO_TAREA_LABEL[tipo]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tareas-responsable">Responsable</label>
          <select id="tareas-responsable" value={responsableFiltro} onChange={(event) => setResponsableFiltro(event.target.value)}>
            <option value="">Todos</option>
            {responsables.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tareas-prioridad">Prioridad</label>
          <select id="tareas-prioridad" value={prioridadFiltro} onChange={(event) => setPrioridadFiltro(event.target.value as PrioridadTarea | "")}>
            <option value="">Todas</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="tareas-origen">Origen</label>
          <select id="tareas-origen" value={origenFiltro} onChange={(event) => setOrigenFiltro(event.target.value as OrigenTarea | "")}>
            <option value="">Todos</option>
            {(Object.entries(ORIGEN_TAREA_LABEL) as [OrigenTarea, string][])
              // Reparto mensual vive en su propio panel ("Cartera mensual"),
              // nunca en esta lista — ofrecerlo aca no tendria resultados.
              .filter(([value]) => value !== "REPARTO_MENSUAL")
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </div>
      </FilterBar>

      <div className="card">
        <DataTable
          columns={columns}
          rows={filasPagina}
          rowKey={(t) => t.id}
          loading={loading}
          emptyMessage="No hay tareas para este filtro."
          stickyFirstColumn
        />
      </div>
      {filasFiltradas.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Pagination page={page} pageSize={PAGE_SIZE_TABLA} total={filasFiltradas.length} onPageChange={setPage} itemLabel="tarea(s)" />
        </div>
      )}

      {tareaDetalle && (
        <TareaDetalleDrawer
          tarea={tareaDetalle}
          cliente={clientesPorDocumento.get(tareaDetalle.numeroDocumentoCliente)}
          onClose={cerrarDetalle}
          onCompletar={() => handleCompletar(tareaDetalle).then(() => setTareaDetalle(null))}
          onPostergar={() => handlePostergar(tareaDetalle).then(() => setTareaDetalle(null))}
          onMarcarSeguimiento={() => handleMarcarSeguimiento(tareaDetalle).then(() => setTareaDetalle(null))}
          onReasignado={() => {
            refetch();
            cerrarDetalle();
          }}
          procesando={procesandoId === tareaDetalle.id}
        />
      )}

      {agendarTarea && (
        <AccionesClienteDrawer
          key={agendarTarea.id}
          numeroDocumentoCliente={agendarTarea.numeroDocumentoCliente}
          origen={{
            modulo: "TAREAS",
            etiqueta: `Tarea: ${agendarTarea.titulo}`,
            entidadTipo: "TAREA",
            entidadId: agendarTarea.id,
          }}
          onClose={() => setAgendarTarea(null)}
        />
      )}
    </div>
  );
}
