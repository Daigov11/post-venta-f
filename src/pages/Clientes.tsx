import { useEffect, useMemo, useState } from "react";
import { InteresesReunionesPanel } from "../components/panels/InteresesReunionesPanel";
import { ClientesFiltrosAvanzados } from "../components/panels/ClientesFiltrosAvanzados";
import { CrearIncidenciaDialog } from "../components/panels/CrearIncidenciaDialog";
import { TareaForm, type TareaFormValues } from "../components/forms/TareaForm";
import { ColumnCustomizer } from "../components/ui/ColumnCustomizer";
import { DataTable } from "../components/ui/DataTable";
import { Drawer } from "../components/ui/Drawer";
import { FilterBar } from "../components/ui/FilterBar";
import { Pagination } from "../components/ui/Pagination";
import { SearchInput } from "../components/ui/SearchInput";
import { Skeleton } from "../components/ui/Skeleton";
import { SavedViewForm } from "../components/forms/SavedViewForm";
import { CrearSeguimientoDialog } from "./clienteFicha/CrearSeguimientoDialog";
import {
  buildAccionesColumn,
  buildAllColumns,
  COLUMN_OPTIONS,
  DEFAULT_VISIBLE_COLUMNS,
  SORT_FIELD_BY_COLUMN,
} from "./Clientes.columns";
import { useAuth } from "../context/AuthContext";
import type { ClientesQueryParams } from "../services/clientes";
import { getClienteIntereses } from "../services/intereses";
import { getReunionesCliente } from "../services/reuniones";
import { createSavedView } from "../services/savedViews";
import { createTarea } from "../services/tareas";
import { useClientes } from "../hooks/useClientes";
import { useOportunidades } from "../hooks/useOportunidades";
import { useSavedViews } from "../hooks/useSavedViews";
import type { EstadoPostVenta, InteresCatalogo, PostVentaCliente, Reunion } from "../types/postventaCliente";
import "./Clientes.css";

const SCREEN = "clientes";
const COLUMNS_STORAGE_KEY = "pv_clientes_columns";
// sessionStorage (no localStorage): se recuerda mientras se navega de ida y
// vuelta a la ficha de un cliente en esta misma sesion del navegador, pero
// no queda pegado para siempre entre visitas distintas — a diferencia de
// visibleColumns, que si es una preferencia de largo plazo.
const FILTERS_STORAGE_KEY = "pv_clientes_filtros_sesion";
const PAGE_SIZE = 25;

interface FiltersState {
  search: string;
  estado: string;
  plan: string;
  periodicidad: string;
  ejecutivo: string;
  tipoOS: string;
  distribuidor: string;
  conDeuda: string;
  conEquipo: string;
  documentacionCompleta: string;
  departamento: string;
  antiguedadMesesMin: string;
  antiguedadMesesMax: string;
  comprobantesMin: string;
  comprobantesMax: string;
  ingresosMensualesMin: string;
  ingresosMensualesMax: string;
  segmento: string;
  renovacionProxima: string;
  sinActividadReciente: string;
  incluirNoActivas: boolean;
}

const DEFAULT_FILTERS: FiltersState = {
  search: "",
  estado: "",
  plan: "",
  periodicidad: "",
  ejecutivo: "",
  tipoOS: "",
  distribuidor: "",
  conDeuda: "",
  conEquipo: "",
  documentacionCompleta: "",
  departamento: "",
  antiguedadMesesMin: "",
  antiguedadMesesMax: "",
  comprobantesMin: "",
  comprobantesMax: "",
  ingresosMensualesMin: "",
  ingresosMensualesMax: "",
  segmento: "",
  renovacionProxima: "",
  sinActividadReciente: "",
  incluirNoActivas: false,
};

interface EstadoGuardado {
  filters: FiltersState;
  sortBy: string | undefined;
  sortDir: "asc" | "desc";
  page: number;
}

// Se lee una sola vez al montar la pagina — si venis de "Volver" desde la
// ficha de un cliente, la pestaña nunca se cerro, sessionStorage sigue
// teniendo lo ultimo que quedo guardado.
function cargarEstadoGuardado(): EstadoGuardado | null {
  try {
    const stored = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<EstadoGuardado>;
    return {
      filters: { ...DEFAULT_FILTERS, ...parsed.filters },
      sortBy: parsed.sortBy,
      sortDir: parsed.sortDir === "desc" ? "desc" : "asc",
      page: typeof parsed.page === "number" && parsed.page > 0 ? parsed.page : 1,
    };
  } catch {
    return null;
  }
}

function toQueryParams(
  filters: FiltersState,
  sortBy: string | undefined,
  sortDir: "asc" | "desc",
  page: number
): ClientesQueryParams {
  return {
    search: filters.search || undefined,
    estado: (filters.estado as EstadoPostVenta) || undefined,
    plan: filters.plan || undefined,
    periodicidad: filters.periodicidad || undefined,
    ejecutivo: filters.ejecutivo || undefined,
    tipoOS: filters.tipoOS || undefined,
    distribuidor: filters.distribuidor || undefined,
    conDeuda: filters.conDeuda ? filters.conDeuda === "true" : undefined,
    conEquipo: filters.conEquipo ? filters.conEquipo === "true" : undefined,
    documentacionCompleta: filters.documentacionCompleta
      ? filters.documentacionCompleta === "true"
      : undefined,
    departamento: filters.departamento || undefined,
    antiguedadMesesMin: filters.antiguedadMesesMin ? Number(filters.antiguedadMesesMin) : undefined,
    antiguedadMesesMax: filters.antiguedadMesesMax ? Number(filters.antiguedadMesesMax) : undefined,
    comprobantesMin: filters.comprobantesMin ? Number(filters.comprobantesMin) : undefined,
    comprobantesMax: filters.comprobantesMax ? Number(filters.comprobantesMax) : undefined,
    ingresosMensualesMin: filters.ingresosMensualesMin ? Number(filters.ingresosMensualesMin) : undefined,
    ingresosMensualesMax: filters.ingresosMensualesMax ? Number(filters.ingresosMensualesMax) : undefined,
    segmento: filters.segmento || undefined,
    renovacionProxima: filters.renovacionProxima ? filters.renovacionProxima === "true" : undefined,
    sinActividadReciente: filters.sinActividadReciente
      ? filters.sinActividadReciente === "true"
      : undefined,
    incluirNoActivas: filters.incluirNoActivas || undefined,
    sortBy: sortBy as ClientesQueryParams["sortBy"],
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  };
}

export function ClientesPage() {
  const estadoGuardado = useMemo(() => cargarEstadoGuardado(), []);
  const [filters, setFilters] = useState<FiltersState>(
    () => estadoGuardado?.filters ?? DEFAULT_FILTERS
  );
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string | undefined>(() => estadoGuardado?.sortBy);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => estadoGuardado?.sortDir ?? "asc");
  const [page, setPage] = useState(() => estadoGuardado?.page ?? 1);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (stored) return JSON.parse(stored) as string[];
    } catch {
      // ignorar storage corrupto
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [savingView, setSavingView] = useState(false);

  const { username } = useAuth();
  const [accionCliente, setAccionCliente] = useState<PostVentaCliente | null>(null);
  const [accionData, setAccionData] = useState<{
    catalogo: InteresCatalogo[];
    marcados: number[];
    reuniones: Reunion[];
  } | null>(null);
  const [accionLoading, setAccionLoading] = useState(false);

  const [tareaCliente, setTareaCliente] = useState<PostVentaCliente | null>(null);
  const [savingTarea, setSavingTarea] = useState(false);
  const [incidenciaCliente, setIncidenciaCliente] = useState<PostVentaCliente | null>(null);
  const [seguimientoCliente, setSeguimientoCliente] = useState<PostVentaCliente | null>(null);

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ filters, sortBy, sortDir, page })
      );
    } catch {
      // ignorar storage lleno/bloqueado — el peor caso es volver a arrancar
      // sin filtros guardados, no rompe nada
    }
  }, [filters, sortBy, sortDir, page]);

  function cargarAccionData(numeroDocumentoCliente: string) {
    setAccionLoading(true);
    Promise.all([
      getClienteIntereses(numeroDocumentoCliente),
      getReunionesCliente(numeroDocumentoCliente),
    ])
      .then(([intereses, reuniones]) => {
        setAccionData({ catalogo: intereses.catalogo, marcados: intereses.marcados, reuniones });
      })
      .finally(() => setAccionLoading(false));
  }

  function handleAbrirAccion(cliente: PostVentaCliente) {
    setAccionCliente(cliente);
    setAccionData(null);
    cargarAccionData(cliente.numeroDocumentoCliente);
  }

  async function handleSubmitTarea(values: TareaFormValues) {
    if (!tareaCliente) return;
    setSavingTarea(true);
    try {
      await createTarea({
        numeroDocumentoCliente: tareaCliente.numeroDocumentoCliente,
        idOrdenServicio: tareaCliente.ordenVigente.idOrdenServicio,
        origen: "FICHA_CLIENTE",
        titulo: values.titulo,
        descripcion: values.descripcion,
        responsable: values.responsable,
        prioridad: values.prioridad,
        tipo: values.tipo,
        fechaVencimiento: values.fechaVencimiento || null,
      });
      setTareaCliente(null);
    } finally {
      setSavingTarea(false);
    }
  }

  const queryParams = useMemo(
    () => toQueryParams(filters, sortBy, sortDir, page),
    [filters, sortBy, sortDir, page]
  );
  const { data, loading, error } = useClientes(queryParams);
  const { data: savedViews, refetch: refetchSavedViews } = useSavedViews(SCREEN);
  // Reutiliza el motor de oportunidades ya expuesto en /oportunidades (mismo
  // que consume la pagina Oportunidades) solo para saber que clientes tienen
  // al menos una señal activa — no se vuelve a evaluar nada aca.
  const { data: oportunidadesData } = useOportunidades();
  const clientesConOportunidad = useMemo(
    () => new Set((oportunidadesData?.data ?? []).map((o) => o.cliente)),
    [oportunidadesData]
  );
  const allColumns = useMemo(
    () => buildAllColumns(clientesConOportunidad),
    [clientesConOportunidad]
  );

  // <tr> nunca es clicable en esta tabla: cada fila expone su ⚙ (ActionMenu)
  // ademas del enlace sobre el nombre del cliente en la columna "cliente" —
  // ambos son focables y accionables por teclado.
  const accionesColumn = buildAccionesColumn({
    onAgendar: handleAbrirAccion,
    onCrearTarea: setTareaCliente,
    onCrearIncidencia: setIncidenciaCliente,
    onRegistrarSeguimiento: setSeguimientoCliente,
  });
  const columns = [accionesColumn, ...allColumns.filter((c) => visibleColumns.includes(c.key))];

  function updateFilter<K extends keyof FiltersState>(key: K, value: FiltersState[K]) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleSortChange(columnKey: string) {
    const field = SORT_FIELD_BY_COLUMN[columnKey];
    if (!field) return;
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  function applySavedView(viewId: string) {
    const view = savedViews?.find((v) => String(v.id) === viewId);
    if (!view) return;
    setFilters({ ...DEFAULT_FILTERS, ...(view.filtros as Partial<FiltersState>) });
    setVisibleColumns(view.columnas);
    setPage(1);
  }

  async function handleSaveView(nombre: string) {
    setSavingView(true);
    try {
      await createSavedView({
        screen: SCREEN,
        nombre,
        columnas: visibleColumns,
        filtros: filters as unknown as Record<string, unknown>,
      });
      setSaveViewOpen(false);
      refetchSavedViews();
    } finally {
      setSavingView(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <div className="page-header-subtitle">Cartera completa de clientes Post Venta</div>
        </div>
      </div>

      <div className="clientes-toolbar">
        <SearchInput
          value={filters.search}
          onChange={(v) => updateFilter("search", v)}
          placeholder="Buscar por razón social, RUC/DNI, OS o teléfono..."
        />
        <div className="clientes-toolbar-right">
          {savedViews && savedViews.length > 0 && (
            <div className="clientes-saved-views">
              <select onChange={(e) => applySavedView(e.target.value)} defaultValue="">
                <option value="" disabled>
                  Vistas guardadas
                </option>
                {savedViews.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => setSaveViewOpen(true)}>
            Guardar vista
          </button>
          <ColumnCustomizer
            columns={COLUMN_OPTIONS}
            visible={visibleColumns}
            onChange={setVisibleColumns}
          />
        </div>
      </div>

      <FilterBar>
        <div className="field">
          <label htmlFor="filtro-segmento">Segmento</label>
          <select
            id="filtro-segmento"
            value={filters.segmento}
            onChange={(e) => updateFilter("segmento", e.target.value)}
          >
            <option value="">Todos</option>
            <option value="DIAMANTE">💎 Diamante</option>
            <option value="ORO">🥇 Oro</option>
            <option value="PLATA">🥈 Plata</option>
            <option value="CRITICO">🔴 Crítico</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="filtro-estado">Estado</label>
          <select
            id="filtro-estado"
            value={filters.estado}
            onChange={(e) => updateFilter("estado", e.target.value)}
          >
            <option value="">Todos</option>
            <option value="NORMAL">Normal</option>
            <option value="REVISAR">Revisar</option>
            <option value="ATENCION">Atención</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="filtro-renovacion">Renovación</label>
          <select
            id="filtro-renovacion"
            value={filters.renovacionProxima}
            onChange={(e) => updateFilter("renovacionProxima", e.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Próxima a vencer</option>
            <option value="false">No próxima</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="filtro-deuda">Deuda</label>
          <select
            id="filtro-deuda"
            value={filters.conDeuda}
            onChange={(e) => updateFilter("conDeuda", e.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Con deuda</option>
            <option value="false">Sin deuda</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="filtro-periodicidad">Periodicidad</label>
          <select
            id="filtro-periodicidad"
            value={filters.periodicidad}
            onChange={(e) => updateFilter("periodicidad", e.target.value)}
          >
            <option value="">Todas</option>
            <option value="MENSUAL">Mensual</option>
            <option value="TRIMESTRAL">Trimestral</option>
            <option value="SEMESTRAL">Semestral</option>
            <option value="ANUAL">Anual</option>
            <option value="DESCONOCIDO">Desconocido</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="filtro-actividad">Actividad</label>
          <select
            id="filtro-actividad"
            value={filters.sinActividadReciente}
            onChange={(e) => updateFilter("sinActividadReciente", e.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Sin actividad reciente</option>
            <option value="false">Activo recientemente</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="filtro-incluir-no-activas">Órdenes no activas</label>
          <select
            id="filtro-incluir-no-activas"
            value={filters.incluirNoActivas ? "true" : ""}
            onChange={(e) => updateFilter("incluirNoActivas", e.target.value === "true")}
          >
            <option value="">Solo órdenes activas</option>
            <option value="true">Incluir suspendidas / de baja</option>
          </select>
        </div>
        <button
          type="button"
          className="btn btn-ghost clientes-more-filters-toggle"
          onClick={() => setShowMoreFilters((v) => !v)}
        >
          {showMoreFilters ? "Menos filtros" : "Más filtros"}
        </button>
      </FilterBar>

      {showMoreFilters && (
        <ClientesFiltrosAvanzados
          values={filters}
          onChange={(key, value) => updateFilter(key, value)}
          onLimpiar={() => {
            setFilters(DEFAULT_FILTERS);
            setPage(1);
          }}
        />
      )}

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(c) => c.numeroDocumentoCliente}
          sortBy={Object.entries(SORT_FIELD_BY_COLUMN).find(([, v]) => v === sortBy)?.[0]}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          loading={loading}
          stickyFirstColumn
        />
      </div>

      {data && (
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
      )}

      <Drawer open={saveViewOpen} onClose={() => setSaveViewOpen(false)} title="Guardar vista">
        <SavedViewForm
          onSubmit={handleSaveView}
          onCancel={() => setSaveViewOpen(false)}
          submitting={savingView}
        />
      </Drawer>

      <Drawer
        open={accionCliente !== null}
        onClose={() => setAccionCliente(null)}
        title={accionCliente ? `Intereses y reuniones — ${accionCliente.nombreCliente}` : undefined}
      >
        {accionLoading || !accionData || !accionCliente ? (
          <Skeleton height={200} />
        ) : (
          <InteresesReunionesPanel
            numeroDocumentoCliente={accionCliente.numeroDocumentoCliente}
            idOrdenServicio={accionCliente.ordenVigente.idOrdenServicio}
            ejecutivoDefault={accionCliente.ordenVigente.ejecutivo}
            telefono={accionCliente.telefonoEfectivo}
            telefonoManual={accionCliente.telefonoManual}
            catalogo={accionData.catalogo}
            marcados={accionData.marcados}
            reuniones={accionData.reuniones}
            origen={{ modulo: "CLIENTES", etiqueta: "Clientes", entidadTipo: "CLIENTE", entidadId: accionCliente.numeroDocumentoCliente }}
            onChanged={() => cargarAccionData(accionCliente.numeroDocumentoCliente)}
          />
        )}
      </Drawer>

      <Drawer
        open={tareaCliente !== null}
        onClose={() => setTareaCliente(null)}
        title={tareaCliente ? `Crear tarea — ${tareaCliente.nombreCliente}` : undefined}
      >
        <TareaForm
          initial={{ responsable: username ?? "", tipo: "SEGUIMIENTO" }}
          onSubmit={handleSubmitTarea}
          onCancel={() => setTareaCliente(null)}
          submitting={savingTarea}
        />
      </Drawer>

      {incidenciaCliente && (
        <CrearIncidenciaDialog
          numeroDocumentoCliente={incidenciaCliente.numeroDocumentoCliente}
          clienteInfo={{
            nombre: incidenciaCliente.nombreCliente,
            ruc: incidenciaCliente.numeroDocumentoCliente,
            ordenVigente: incidenciaCliente.ordenVigente.idOrdenServicio,
          }}
          onClose={() => setIncidenciaCliente(null)}
          onCreada={() => setIncidenciaCliente(null)}
        />
      )}

      {seguimientoCliente && (
        <CrearSeguimientoDialog
          numeroDocumentoCliente={seguimientoCliente.numeroDocumentoCliente}
          onClose={() => setSeguimientoCliente(null)}
          onCreado={() => setSeguimientoCliente(null)}
        />
      )}
    </div>
  );
}
