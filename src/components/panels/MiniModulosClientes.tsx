import { useEffect, useMemo, useState } from "react";
import { AccionesClienteDrawer, columnaAccionesCliente } from "./AccionesClienteDrawer";
import { BajaHistoricoDrawer } from "./BajaHistoricoDrawer";
import { SeguimientoPostVentaDrawer } from "./SeguimientoPostVentaDrawer";
import { Badge, type BadgeTone } from "../ui/Badge";
import { ClienteCell } from "../ui/ClienteCell";
import { CollapsibleCard } from "../ui/CollapsibleCard";
import { DataTable, type DataTableColumn } from "../ui/DataTable";
import { Pagination } from "../ui/Pagination";
import { SearchInput } from "../ui/SearchInput";
import { getClientes, getClientesBaja } from "../../services/clientes";
import { getSeguimientoPostVenta } from "../../services/seguimientoPostVenta";
import type {
  ClienteBajaResumen,
  ClientesQueryResult,
  EstadoPipelineSeguimiento,
  PostVentaCliente,
  SeguimientoResumen,
} from "../../types/postventaCliente";
import { formatCurrency, formatNumber } from "../../utils/format";
import "./MiniModulosClientes.css";

// Tres listas desplegables sobre la cartera que no encajan en el cuadro de
// filtros normal de Clientes: clientes nuevos por periodo, suspendidos por
// pago, y dados de baja (estos ultimos ni siquiera estan en el dataset
// normal — ver getClientesExcluidos en el backend).


type Granularidad = "dia" | "semana" | "mes" | "anio";
const GRANULARIDADES: { value: Granularidad; label: string }[] = [
  { value: "dia", label: "Día" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "anio", label: "Año" },
];

// Mismo criterio de alineacion a calendario que usa el backend en
// clientesQuery.ts (rangoDePeriodo) — semana de domingo a sabado.
function inicioDePeriodo(granularidad: Granularidad, fecha: Date): Date {
  if (granularidad === "dia") return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  if (granularidad === "semana") {
    const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  if (granularidad === "mes") return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  return new Date(fecha.getFullYear(), 0, 1);
}

// offset = cantidad de periodos (en la unidad de granularidad) hacia atras
// (negativo) o adelante (nunca > 0, no se navega al futuro) desde hoy.
function referenciaConOffset(granularidad: Granularidad, offset: number, hoy: Date): Date {
  const d = new Date(hoy);
  if (granularidad === "dia") d.setDate(d.getDate() + offset);
  else if (granularidad === "semana") d.setDate(d.getDate() + offset * 7);
  else if (granularidad === "mes") d.setMonth(d.getMonth() + offset);
  else d.setFullYear(d.getFullYear() + offset);
  return d;
}

function etiquetaPeriodo(granularidad: Granularidad, inicio: Date): string {
  if (granularidad === "dia") {
    return inicio.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (granularidad === "semana") {
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
    return `${fmt(inicio)} – ${fmt(fin)} de ${fin.getFullYear()}`;
  }
  if (granularidad === "mes") {
    return inicio.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
  }
  return String(inicio.getFullYear());
}

// ISO del inicio del periodo elegido — es lo que se manda al backend como
// "referencia" (cualquier fecha dentro del periodo sirve, el backend vuelve
// a alinear con el mismo criterio).
function referenciaISO(granularidad: Granularidad, offset: number): string {
  return inicioDePeriodo(granularidad, referenciaConOffset(granularidad, offset, new Date())).toISOString();
}

// Selector de granularidad (dia/semana/mes/anio) + navegador anterior/siguiente,
// reutilizado por los mini-modulos de clientes que filtran por un periodo.
function PeriodoNavigator({
  granularidad,
  onGranularidadChange,
  offset,
  onOffsetChange,
}: {
  granularidad: Granularidad;
  onGranularidadChange: (g: Granularidad) => void;
  offset: number;
  onOffsetChange: (o: number) => void;
}) {
  const hoy = useMemo(() => new Date(), []);
  const inicio = useMemo(
    () => inicioDePeriodo(granularidad, referenciaConOffset(granularidad, offset, hoy)),
    [granularidad, offset, hoy]
  );

  return (
    <>
      <div className="modulo-clientes-periodo">
        {GRANULARIDADES.map((g) => (
          <button
            key={g.value}
            type="button"
            className={granularidad === g.value ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => {
              onGranularidadChange(g.value);
              onOffsetChange(0);
            }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "10px 16px",
          marginBottom: 12,
        }}
      >
        <button type="button" className="btn btn-secondary" onClick={() => onOffsetChange(offset - 1)}>
          ← Anterior
        </button>
        <strong style={{ fontSize: 15, minWidth: 200, textAlign: "center" }}>
          {etiquetaPeriodo(granularidad, inicio)}
          {offset === 0 && " (actual)"}
        </strong>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onOffsetChange(Math.min(0, offset + 1))}
          disabled={offset === 0}
        >
          Siguiente →
        </button>
      </div>
    </>
  );
}

type Orden = "recientes" | "antiguos";

// Toggle reutilizable en los 4 modulos para elegir entre lo mas reciente y
// lo mas antiguo primero — cada modulo lo traduce a su propio criterio de
// fecha (fecha de alta, vencido desde, fecha de baja, fecha de inicio de
// seguimiento).
function OrdenToggle({ orden, onChange }: { orden: Orden; onChange: (o: Orden) => void }) {
  return (
    <div className="modulo-clientes-periodo">
      <span className="muted" style={{ alignSelf: "center" }}>
        Orden:
      </span>
      <button
        type="button"
        className={orden === "recientes" ? "btn btn-primary" : "btn btn-secondary"}
        onClick={() => onChange("recientes")}
      >
        Más recientes primero
      </button>
      <button
        type="button"
        className={orden === "antiguos" ? "btn btn-primary" : "btn btn-secondary"}
        onClick={() => onChange("antiguos")}
      >
        Más antiguos primero
      </button>
    </div>
  );
}

function columnasNuevos(
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
    { key: "plan", label: "Plan", render: (c) => c.planActual.nombre },
    {
      key: "fechaAlta",
      label: "Fecha de alta",
      render: (c) =>
        c.fechaInicioCliente ? new Date(c.fechaInicioCliente).toLocaleDateString("es-PE") : "—",
    },
    { key: "ejecutivo", label: "Ejecutivo", render: (c) => c.ordenVigente.ejecutivo ?? "—" },
  ];
}

function ModuloNuevos({
  onAbrirAcciones,
}: {
  onAbrirAcciones: (numeroDocumentoCliente: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [granularidad, setGranularidad] = useState<Granularidad>("semana");
  const [offset, setOffset] = useState(0);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ClientesQueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setLoading(true);
    getClientes({
      nuevoGranularidad: granularidad,
      nuevoReferencia: referenciaISO(granularidad, offset),
      search: search || undefined,
      pageSize: 500,
      sortBy: "fechaInicioCliente",
      sortDir: orden === "recientes" ? "desc" : "asc",
    })
      .then(setData)
      .finally(() => setLoading(false));
  }, [abierto, granularidad, offset, orden, search]);

  return (
    <CollapsibleCard
      titulo="Clientes nuevos"
      abierto={abierto}
      onToggle={() => setAbierto((v) => !v)}
      contador={data?.total}
      tone="success"
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o RUC..." />
      <PeriodoNavigator
        granularidad={granularidad}
        onGranularidadChange={setGranularidad}
        offset={offset}
        onOffsetChange={setOffset}
      />
      <OrdenToggle orden={orden} onChange={setOrden} />
      {data && data.total > data.data.length && (
        <p className="muted">
          Mostrando los primeros {formatNumber(data.data.length)} de {formatNumber(data.total)}.
        </p>
      )}
      <DataTable
        columns={columnasNuevos(onAbrirAcciones)}
        rows={data?.data ?? []}
        rowKey={(c) => c.numeroDocumentoCliente}
        loading={loading}
        emptyMessage="Sin clientes nuevos en este período."
      />
    </CollapsibleCard>
  );
}

function columnasSuspendidos(
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
    { key: "plan", label: "Plan", render: (c) => c.planActual.nombre },
    {
      key: "vencidoDesde",
      label: "Vencido desde",
      render: (c) => (c.vencidoDesde ? new Date(c.vencidoDesde).toLocaleDateString("es-PE") : "—"),
    },
    {
      key: "diasVencido",
      label: "Días vencido",
      align: "right",
      render: (c) => (c.diasVencido === null ? "—" : formatNumber(c.diasVencido)),
    },
    {
      key: "deuda",
      label: "Deuda",
      align: "right",
      render: (c) => formatCurrency(c.deudaTotal),
    },
    { key: "ejecutivo", label: "Ejecutivo", render: (c) => c.ordenVigente.ejecutivo ?? "—" },
  ];
}

function ModuloSuspendidos({
  onAbrirAcciones,
}: {
  onAbrirAcciones: (numeroDocumentoCliente: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [porPeriodo, setPorPeriodo] = useState(false);
  const [granularidad, setGranularidad] = useState<Granularidad>("semana");
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ClientesQueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setLoading(true);
    getClientes({
      nEstadoApiWorkingRaw: "SUSPENDIDO POR PAGO",
      suspendidoGranularidad: porPeriodo ? granularidad : undefined,
      suspendidoReferencia: porPeriodo ? referenciaISO(granularidad, offset) : undefined,
      search: search || undefined,
      pageSize: 500,
      sortBy: "vencidoDesde",
      sortDir: orden === "recientes" ? "desc" : "asc",
    })
      .then(setData)
      .finally(() => setLoading(false));
  }, [abierto, orden, porPeriodo, granularidad, offset, search]);

  return (
    <CollapsibleCard
      titulo="Suspendidos por falta de pago"
      abierto={abierto}
      onToggle={() => setAbierto((v) => !v)}
      contador={data?.total}
      tone="critical"
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o RUC..." />
      <div className="modulo-clientes-periodo">
        <button
          type="button"
          className={porPeriodo ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => setPorPeriodo((v) => !v)}
        >
          {porPeriodo ? "Ver todos" : "Filtrar por período (vencido desde)"}
        </button>
      </div>
      {porPeriodo && (
        <PeriodoNavigator
          granularidad={granularidad}
          onGranularidadChange={setGranularidad}
          offset={offset}
          onOffsetChange={setOffset}
        />
      )}
      <OrdenToggle orden={orden} onChange={setOrden} />
      <DataTable
        columns={columnasSuspendidos(onAbrirAcciones)}
        rows={data?.data ?? []}
        rowKey={(c) => c.numeroDocumentoCliente}
        loading={loading}
        emptyMessage="Sin clientes suspendidos por falta de pago."
      />
    </CollapsibleCard>
  );
}

function columnasBaja(
  onAbrirAcciones: (numeroDocumentoCliente: string) => void,
  onVerHistorico: (cliente: ClienteBajaResumen) => void
): DataTableColumn<ClienteBajaResumen>[] {
  return [
    columnaAccionesCliente<ClienteBajaResumen>((c) => c.numeroDocumentoCliente, onAbrirAcciones),
    {
      key: "historico",
      label: "Seguimiento anterior",
      align: "center",
      render: (c) =>
        c.historico ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={(event) => {
              event.stopPropagation();
              onVerHistorico(c);
            }}
          >
            Ver
          </button>
        ) : (
          <span className="muted">—</span>
        ),
    },
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
    { key: "plan", label: "Plan", render: (c) => c.planActual.nombre },
    { key: "deuda", label: "Deuda", align: "right", render: (c) => formatCurrency(c.deudaTotal) },
    { key: "ejecutivo", label: "Ejecutivo", render: (c) => c.ejecutivo ?? "—" },
    {
      key: "fechaBaja",
      label: "Dado de baja",
      render: (c) =>
        c.fechaBaja ? (
          new Date(c.fechaBaja).toLocaleDateString("es-PE")
        ) : (
          <span className="muted">No aparece en el historial</span>
        ),
    },
  ];
}

const BAJA_PAGE_SIZE = 20;

function ModuloBaja({
  onAbrirAcciones,
}: {
  onAbrirAcciones: (numeroDocumentoCliente: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [page, setPage] = useState(1);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [porPeriodo, setPorPeriodo] = useState(false);
  const [granularidad, setGranularidad] = useState<Granularidad>("semana");
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{
    data: ClienteBajaResumen[];
    page: number;
    pageSize: number;
    total: number;
    pendientesVerificar?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [historicoSeleccionado, setHistoricoSeleccionado] = useState<ClienteBajaResumen | null>(
    null
  );

  useEffect(() => {
    if (!abierto) return;
    setLoading(true);
    getClientesBaja({
      page,
      pageSize: BAJA_PAGE_SIZE,
      orden: orden === "recientes" ? "reciente" : "antiguo",
      granularidad: porPeriodo ? granularidad : undefined,
      referencia: porPeriodo ? referenciaISO(granularidad, offset) : undefined,
      search: search || undefined,
    })
      .then(setData)
      .finally(() => setLoading(false));
  }, [abierto, page, orden, porPeriodo, granularidad, offset, search]);

  return (
    <CollapsibleCard
      titulo="Dados de baja"
      abierto={abierto}
      onToggle={() => setAbierto((v) => !v)}
      contador={data?.total}
      tone="warning"
    >
      <p className="muted">
        La fecha se busca en el historial de APIWorking la primera vez que se ve cada página —
        puede tardar unos segundos; después queda guardada. "Seguimiento anterior" es referencia
        importada del Excel de bajas, cuando existe para ese cliente.
      </p>
      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Buscar por nombre o RUC..."
      />
      <div className="modulo-clientes-periodo">
        <button
          type="button"
          className={porPeriodo ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => {
            setPorPeriodo((v) => !v);
            setPage(1);
          }}
        >
          {porPeriodo ? "Ver todos" : "Filtrar por período (fecha de baja)"}
        </button>
      </div>
      {porPeriodo && (
        <PeriodoNavigator
          granularidad={granularidad}
          onGranularidadChange={(g) => {
            setGranularidad(g);
            setPage(1);
          }}
          offset={offset}
          onOffsetChange={(o) => {
            setOffset(o);
            setPage(1);
          }}
        />
      )}
      {porPeriodo && !!data?.pendientesVerificar && (
        <p className="muted">
          {formatNumber(data.pendientesVerificar)} cliente(s) dado(s) de baja todavía sin fecha
          verificada — no están incluidos en este filtro. Desactivá "Filtrar por período" y recorré
          sus páginas para verificarlos.
        </p>
      )}
      <OrdenToggle
        orden={orden}
        onChange={(o) => {
          setOrden(o);
          setPage(1);
        }}
      />
      <DataTable
        columns={columnasBaja(onAbrirAcciones, setHistoricoSeleccionado)}
        rows={data?.data ?? []}
        rowKey={(c) => c.numeroDocumentoCliente}
        loading={loading}
        emptyMessage="Sin clientes dados de baja."
      />
      {data && data.total > 0 && (
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
      )}
      {historicoSeleccionado?.historico && (
        <BajaHistoricoDrawer
          nombreCliente={historicoSeleccionado.nombreCliente}
          historico={historicoSeleccionado.historico}
          onClose={() => setHistoricoSeleccionado(null)}
        />
      )}
    </CollapsibleCard>
  );
}

const ESTADO_PIPELINE_TONE: Record<EstadoPipelineSeguimiento, BadgeTone> = {
  EN_PROCESO: "neutral",
  EXITOSO: "success",
  REQUIERE_ATENCION: "critical",
};

const ESTADO_PIPELINE_LABEL: Record<EstadoPipelineSeguimiento, string> = {
  EN_PROCESO: "En proceso",
  EXITOSO: "Cliente exitoso",
  REQUIERE_ATENCION: "Requiere atención",
};

function columnasSeguimiento(
  onAbrirAcciones: (numeroDocumentoCliente: string) => void,
  onRegistrarSeguimiento: (numeroDocumentoCliente: string) => void
): DataTableColumn<SeguimientoResumen>[] {
  return [
    columnaAccionesCliente<SeguimientoResumen>((r) => r.numeroDocumentoCliente, onAbrirAcciones),
    {
      key: "registrar",
      label: "Seguimiento",
      align: "center",
      render: (r) => (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onRegistrarSeguimiento(r.numeroDocumentoCliente)}
        >
          {r.estadoPipeline === "EN_PROCESO" ? "Registrar" : "Ver"}
        </button>
      ),
    },
    {
      key: "cliente",
      label: "Cliente",
      render: (r) => (
        <ClienteCell
          numeroDocumentoCliente={r.numeroDocumentoCliente}
          nombreCliente={r.nombreCliente}
          sistemas={r.sistemas}
        />
      ),
    },
    { key: "plan", label: "Plan", render: (r) => r.plan },
    {
      key: "origen",
      label: "Origen",
      render: (r) => (
        <Badge tone="neutral">{r.origen === "AUTOMATICO" ? "Automático" : "Importado (Excel)"}</Badge>
      ),
    },
    {
      key: "etapa",
      label: "Etapa actual",
      render: (r) =>
        r.etapaActual ? (
          <span>
            Etapa {r.etapaActual.etapa}
            {r.etapaActual.vencida && (
              <>
                {" "}
                <Badge tone="warning">Toca contactar</Badge>
              </>
            )}
          </span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: "estadoPipeline",
      label: "Estado",
      render: (r) => (
        <Badge tone={ESTADO_PIPELINE_TONE[r.estadoPipeline]}>
          {ESTADO_PIPELINE_LABEL[r.estadoPipeline]}
        </Badge>
      ),
    },
    { key: "ejecutivo", label: "Ejecutivo", render: (r) => r.ejecutivo ?? "—" },
  ];
}

// Semana de domingo a sabado, mismo criterio que ya usa el backend en
// clientesQuery.ts (getDay()=0 -> domingo).
function inicioDeSemana(fecha: Date): Date {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

interface SemanaInfo {
  inicio: Date;
  fin: Date;
  label: string;
}

function semanaRelativa(ahora: Date, offsetSemanas: number): SemanaInfo {
  const inicio = inicioDeSemana(ahora);
  inicio.setDate(inicio.getDate() + offsetSemanas * 7);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
  return { inicio, fin, label: `${fmt(inicio)} – ${fmt(fin)} de ${fin.getFullYear()}` };
}

function ModuloSeguimientoPostVenta({
  onAbrirAcciones,
  onRegistrarSeguimiento,
}: {
  onAbrirAcciones: (numeroDocumentoCliente: string) => void;
  onRegistrarSeguimiento: (numeroDocumentoCliente: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState<"" | "1" | "2" | "3">("");
  const [filtroEstado, setFiltroEstado] = useState<"" | EstadoPipelineSeguimiento>("");
  const [porSemana, setPorSemana] = useState(false);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{ data: SeguimientoResumen[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!abierto || data) return;
    setLoading(true);
    getSeguimientoPostVenta()
      .then(setData)
      .finally(() => setLoading(false));
  }, [abierto, data]);

  const ahora = useMemo(() => new Date(), []);
  const semana = useMemo(() => semanaRelativa(ahora, semanaOffset), [ahora, semanaOffset]);

  const filas = (data?.data ?? [])
    .filter((r) => {
      if (filtroEtapa && r.etapaActual?.etapa !== Number(filtroEtapa)) return false;
      if (filtroEstado && r.estadoPipeline !== filtroEstado) return false;
      if (porSemana) {
        const fechaInicio = new Date(r.fechaInicio);
        if (fechaInicio < semana.inicio || fechaInicio > semana.fin) return false;
      }
      if (search) {
        const needle = search.trim().toLowerCase();
        const matches =
          r.nombreCliente.toLowerCase().includes(needle) ||
          r.numeroDocumentoCliente.toLowerCase().includes(needle);
        if (!matches) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dir = orden === "recientes" ? -1 : 1;
      return dir * a.fechaInicio.localeCompare(b.fechaInicio);
    });

  return (
    <CollapsibleCard
      titulo="Seguimiento Post Venta"
      abierto={abierto}
      onToggle={() => setAbierto((v) => !v)}
      contador={data?.total}
      tone="info"
    >
      <p className="muted">
        Onboarding de clientes recién capacitados — 3 rondas de contacto (bienvenida, +15 días,
        +30 días). Incluye a los ya seguidos a mano en el Excel de Ligia (importados).
      </p>
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o RUC..." />
      <div className="modulo-clientes-periodo">
        <select value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value as "" | "1" | "2" | "3")}>
          <option value="">Todas las etapas</option>
          <option value="1">Etapa 1</option>
          <option value="2">Etapa 2</option>
          <option value="3">Etapa 3</option>
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as "" | EstadoPipelineSeguimiento)}
        >
          <option value="">Todos los estados</option>
          <option value="EN_PROCESO">En proceso</option>
          <option value="EXITOSO">Cliente exitoso</option>
          <option value="REQUIERE_ATENCION">Requiere atención</option>
        </select>
        <button
          type="button"
          className={porSemana ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => setPorSemana((v) => !v)}
        >
          {porSemana ? "Ver todas las semanas" : "Ver por semana"}
        </button>
      </div>
      <OrdenToggle orden={orden} onChange={setOrden} />

      {porSemana && (
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 16,
            padding: "10px 16px",
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSemanaOffset((o) => o - 1)}
          >
            ← Semana anterior
          </button>
          <strong style={{ fontSize: 15, minWidth: 200, textAlign: "center" }}>
            {semana.label}
            {semanaOffset === 0 && " (esta semana)"}
          </strong>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSemanaOffset((o) => Math.min(0, o + 1))}
            disabled={semanaOffset === 0}
          >
            Semana siguiente →
          </button>
        </div>
      )}

      {porSemana && (
        <p className="muted">
          {formatNumber(filas.length)} cliente(s) nuevo(s) en esa semana (según fecha de inicio
          del seguimiento).
        </p>
      )}

      <DataTable
        columns={columnasSeguimiento(onAbrirAcciones, onRegistrarSeguimiento)}
        rows={filas}
        rowKey={(r) => r.numeroDocumentoCliente}
        loading={loading}
        emptyMessage={
          porSemana ? "Sin clientes nuevos en esta semana." : "Sin clientes en seguimiento post venta."
        }
      />
    </CollapsibleCard>
  );
}

export function MiniModulosClientes() {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [clienteSeguimiento, setClienteSeguimiento] = useState<string | null>(null);

  return (
    <div className="modulo-clientes-grid">
      <ModuloNuevos onAbrirAcciones={setClienteSeleccionado} />
      <ModuloSuspendidos onAbrirAcciones={setClienteSeleccionado} />
      <ModuloBaja onAbrirAcciones={setClienteSeleccionado} />
      <ModuloSeguimientoPostVenta
        onAbrirAcciones={setClienteSeleccionado}
        onRegistrarSeguimiento={setClienteSeguimiento}
      />

      {clienteSeleccionado && (
        <AccionesClienteDrawer
          key={clienteSeleccionado}
          numeroDocumentoCliente={clienteSeleccionado}
          onClose={() => setClienteSeleccionado(null)}
        />
      )}

      {clienteSeguimiento && (
        <SeguimientoPostVentaDrawer
          key={clienteSeguimiento}
          numeroDocumentoCliente={clienteSeguimiento}
          onClose={() => setClienteSeguimiento(null)}
        />
      )}
    </div>
  );
}
