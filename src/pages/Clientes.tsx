import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InteresesReunionesPanel } from "../components/panels/InteresesReunionesPanel";
import { Badge } from "../components/ui/Badge";
import { ColumnCustomizer, type ColumnOption } from "../components/ui/ColumnCustomizer";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { Drawer } from "../components/ui/Drawer";
import { FilterBar } from "../components/ui/FilterBar";
import { Pagination } from "../components/ui/Pagination";
import { SearchInput } from "../components/ui/SearchInput";
import { Skeleton } from "../components/ui/Skeleton";
import { SistemasBadges } from "../components/ui/SistemasBadges";
import { EstadoPostVentaPill, SegmentoPill } from "../components/ui/StatusPill";
import { SavedViewForm } from "../components/forms/SavedViewForm";
import type { ClientesQueryParams } from "../services/clientes";
import { getClienteIntereses } from "../services/intereses";
import { getReunionesCliente } from "../services/reuniones";
import { createSavedView } from "../services/savedViews";
import { useClientes } from "../hooks/useClientes";
import { useSavedViews } from "../hooks/useSavedViews";
import type {
  EstadoPostVenta,
  InteresCatalogo,
  PostVentaCliente,
  Reunion,
} from "../types/postventaCliente";
import { formatCurrency, formatNumber } from "../utils/format";
import "./Clientes.css";

const SCREEN = "clientes";
const COLUMNS_STORAGE_KEY = "pv_clientes_columns";
const PAGE_SIZE = 25;

const SORT_FIELD_BY_COLUMN: Record<string, string> = {
  estado: "estadoPostVentaEfectivo",
  cliente: "nombreCliente",
  antiguedad: "antiguedadMeses",
  comprobantes: "cantidadComprobantesHistorico",
  deuda: "deudaTotal",
  renovacion: "diasParaRenovacion",
  ingresosMensuales: "ingresosClienteMensual",
  actividad: "diasSinActividad",
};

const ALL_COLUMNS: DataTableColumn<PostVentaCliente>[] = [
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
    render: (c) => (
      <SegmentoPill segmento={c.segmentoEfectivo} manual={!!c.segmentoManual} />
    ),
  },
  {
    key: "cliente",
    label: "Cliente",
    sortable: true,
    render: (c) => (
      <div className="cliente-cell">
        <span className="cliente-cell-nombre">{c.nombreCliente}</span>
        <span className="cliente-cell-ruc">{c.numeroDocumentoCliente}</span>
        <SistemasBadges sistemas={c.sistemas} />
      </div>
    ),
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
    label: "Deuda",
    sortable: true,
    align: "right",
    render: (c) => (
      <span
        style={
          c.deudaTotal > 0
            ? { color: "var(--color-critical)", fontWeight: 600 }
            : undefined
        }
      >
        {formatCurrency(c.deudaTotal)}
      </span>
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
    label: "Renovación",
    sortable: true,
    align: "right",
    render: (c) => {
      if (c.diasParaRenovacion === null) return <span className="muted">—</span>;
      if (c.diasParaRenovacion < 0) return <Badge tone="critical">Vencida</Badge>;
      return (
        <Badge tone={c.diasParaRenovacion <= 7 ? "warning" : "neutral"}>
          {c.diasParaRenovacion} día(s)
        </Badge>
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
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
];

const COLUMN_OPTIONS: ColumnOption[] = ALL_COLUMNS.map((c) => ({ key: c.key, label: c.label }));

// Set inicial minimo — con los 21 campos disponibles, mostrar todo de
// entrada satura el cuadro. El resto (segmento, rubro, alertas, etc.) sigue
// disponible en "Agregar/quitar columnas", y cada usuario lo ajusta a su
// gusto (persistido en localStorage) — esto es solo lo que ve alguien que
// nunca lo toco.
const DEFAULT_VISIBLE_COLUMNS = [
  "estado",
  "cliente",
  "plan",
  "deuda",
  "ingresosMensuales",
  "renovacion",
  "ejecutivo",
];

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
};

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
    sortBy: sortBy as ClientesQueryParams["sortBy"],
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  };
}

export function ClientesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
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

  const [accionCliente, setAccionCliente] = useState<PostVentaCliente | null>(null);
  const [accionData, setAccionData] = useState<{
    catalogo: InteresCatalogo[];
    marcados: number[];
    reuniones: Reunion[];
  } | null>(null);
  const [accionLoading, setAccionLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

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

  const queryParams = useMemo(
    () => toQueryParams(filters, sortBy, sortDir, page),
    [filters, sortBy, sortDir, page]
  );
  const { data, loading, error } = useClientes(queryParams);
  const { data: savedViews, refetch: refetchSavedViews } = useSavedViews(SCREEN);

  const accionesColumn: DataTableColumn<PostVentaCliente> = {
    key: "acciones",
    label: "Acciones",
    render: (c) => (
      <button
        type="button"
        className="btn btn-ghost"
        onClick={(event) => {
          event.stopPropagation();
          handleAbrirAccion(c);
        }}
      >
        📅 Agendar / 🎯 Interés
      </button>
    ),
  };
  const columns = [accionesColumn, ...ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key))];

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
        <button
          type="button"
          className="btn btn-ghost clientes-more-filters-toggle"
          onClick={() => setShowMoreFilters((v) => !v)}
        >
          {showMoreFilters ? "Menos filtros" : "Más filtros"}
        </button>
      </FilterBar>

      {showMoreFilters && (
        <FilterBar>
          <div className="field">
            <label htmlFor="filtro-equipo">Equipo</label>
            <select
              id="filtro-equipo"
              value={filters.conEquipo}
              onChange={(e) => updateFilter("conEquipo", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Con equipo</option>
              <option value="false">Sin equipo</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="filtro-doc">Documentación</label>
            <select
              id="filtro-doc"
              value={filters.documentacionCompleta}
              onChange={(e) => updateFilter("documentacionCompleta", e.target.value)}
            >
              <option value="">Todas</option>
              <option value="true">Completa</option>
              <option value="false">Incompleta</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="filtro-plan">Plan</label>
            <input
              id="filtro-plan"
              value={filters.plan}
              onChange={(e) => updateFilter("plan", e.target.value)}
              placeholder="Nombre exacto del plan"
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-ejecutivo">Ejecutivo</label>
            <input
              id="filtro-ejecutivo"
              value={filters.ejecutivo}
              onChange={(e) => updateFilter("ejecutivo", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-tipoos">Tipo OS</label>
            <input
              id="filtro-tipoos"
              value={filters.tipoOS}
              onChange={(e) => updateFilter("tipoOS", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-distribuidor">Vendedor/Distribuidor</label>
            <input
              id="filtro-distribuidor"
              value={filters.distribuidor}
              onChange={(e) => updateFilter("distribuidor", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-departamento">Departamento</label>
            <input
              id="filtro-departamento"
              value={filters.departamento}
              onChange={(e) => updateFilter("departamento", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-ant-min">Antigüedad mín. (meses)</label>
            <input
              id="filtro-ant-min"
              type="number"
              min={0}
              value={filters.antiguedadMesesMin}
              onChange={(e) => updateFilter("antiguedadMesesMin", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-ant-max">Antigüedad máx. (meses)</label>
            <input
              id="filtro-ant-max"
              type="number"
              min={0}
              value={filters.antiguedadMesesMax}
              onChange={(e) => updateFilter("antiguedadMesesMax", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-comp-min">Comprobantes mín.</label>
            <input
              id="filtro-comp-min"
              type="number"
              min={0}
              value={filters.comprobantesMin}
              onChange={(e) => updateFilter("comprobantesMin", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-comp-max">Comprobantes máx.</label>
            <input
              id="filtro-comp-max"
              type="number"
              min={0}
              value={filters.comprobantesMax}
              onChange={(e) => updateFilter("comprobantesMax", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-ingreso-min">Ingresos mensuales mín. (S/)</label>
            <input
              id="filtro-ingreso-min"
              type="number"
              min={0}
              value={filters.ingresosMensualesMin}
              onChange={(e) => updateFilter("ingresosMensualesMin", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-ingreso-max">Ingresos mensuales máx. (S/)</label>
            <input
              id="filtro-ingreso-max"
              type="number"
              min={0}
              value={filters.ingresosMensualesMax}
              onChange={(e) => updateFilter("ingresosMensualesMax", e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              setPage(1);
            }}
          >
            Limpiar filtros
          </button>
        </FilterBar>
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
          onRowClick={(c) => navigate(`/clientes/${c.numeroDocumentoCliente}`)}
          loading={loading}
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
            onChanged={() => cargarAccionData(accionCliente.numeroDocumentoCliente)}
          />
        )}
      </Drawer>
    </div>
  );
}
