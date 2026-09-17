import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AccionesClienteDrawer, columnaAccionesCliente } from "../components/panels/AccionesClienteDrawer";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { ClienteCell } from "../components/ui/ClienteCell";
import { CollapsibleCard } from "../components/ui/CollapsibleCard";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { FilterBar } from "../components/ui/FilterBar";
import { useClientes } from "../hooks/useClientes";
import { useTareas } from "../hooks/useTareas";
import { useTareasRenovacion } from "../hooks/useTareasRenovacion";
import { updateTarea } from "../services/tareas";
import type {
  EstadoTarea,
  Periodicidad,
  PostVentaCliente,
  PrioridadTarea,
  Tarea,
  TareaRenovacion,
} from "../types/postventaCliente";
import { formatCurrency } from "../utils/format";

const ESTADO_LABEL: Record<EstadoTarea, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  ESPERANDO_CLIENTE: "Esperando cliente",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

const ESTADO_TONE: Record<EstadoTarea, BadgeTone> = {
  PENDIENTE: "neutral",
  EN_PROCESO: "info",
  ESPERANDO_CLIENTE: "warning",
  COMPLETADA: "success",
  CANCELADA: "critical",
};

// Antes se mostraba como texto plano, sin color ni ícono — no cumplía el
// requisito de "prioridad visible con texto + ícono + color" del Handoff
// Postventa.
const PRIORIDAD_LABEL: Record<PrioridadTarea, string> = {
  ALTA: "🔴 Alta",
  MEDIA: "🟡 Media",
  BAJA: "⚪ Baja",
};
const PRIORIDAD_TONE: Record<PrioridadTarea, BadgeTone> = {
  ALTA: "critical",
  MEDIA: "warning",
  BAJA: "neutral",
};

// Auditoría Fase 1: la primera version de esto usaba altaPendiente/
// certificadoPorVencer/certificadoVenceHoy directamente y lo llamaba
// "incidencia" — esas 3 señales SON exactamente las condiciones de disparo
// de los tipos de alerta ALTA_PENDIENTE/CERTIFICADO_POR_VENCER/
// CERTIFICADO_VENCE_HOY (ver backend/src/engines/alertas.engine.ts), no el
// modulo de incidencias de APIWorking. Mostrarlo como "incidencia" en una
// pantalla que no es la ficha del cliente arriesgaba leerse como el conteo
// global de incidencias, que no existe sin el endpoint agregador de Fase 2.
// Se reemplaza por metadata.alertasCount.CRITICAL — el mismo agregado ya
// validado (una sola pasada en memoria por refresh del dataset, ver
// postventaCache.ts) que usa la columna "Alertas" de Cartera.
function tieneAlertaCritica(cliente: PostVentaCliente | undefined): boolean {
  return (cliente?.metadata.alertasCount.CRITICAL ?? 0) > 0;
}

function buildColumns(
  clientesPorDocumento: Map<string, PostVentaCliente>
): DataTableColumn<Tarea>[] {
  return [
    {
      key: "prioridadAlerta",
      label: "Prioridad",
      render: (t) => {
        const cliente = clientesPorDocumento.get(t.numeroDocumentoCliente);
        if (!tieneAlertaCritica(cliente)) return <span className="muted">—</span>;
        return <Badge tone="critical">⚠ Cliente con alerta crítica</Badge>;
      },
    },
    { key: "titulo", label: "Tarea", render: (t) => <strong>{t.titulo}</strong> },
    {
      key: "cliente",
      label: "Cliente",
      render: (t) => (
        <Link to={`/clientes/${t.numeroDocumentoCliente}`}>{t.numeroDocumentoCliente}</Link>
      ),
    },
    { key: "responsable", label: "Responsable", render: (t) => t.responsable },
    {
      key: "prioridad",
      label: "Prioridad de la tarea",
      render: (t) => <Badge tone={PRIORIDAD_TONE[t.prioridad]}>{PRIORIDAD_LABEL[t.prioridad]}</Badge>,
    },
    {
      key: "estado",
      label: "Estado",
      render: (t) => <Badge tone={ESTADO_TONE[t.estado]}>{ESTADO_LABEL[t.estado]}</Badge>,
    },
    { key: "vencimiento", label: "Vence", render: (t) => t.fechaVencimiento ?? "—" },
  ];
}

const PERIODICIDADES: { value: Periodicidad; label: string }[] = [
  { value: "MENSUAL", label: "Mensual" },
  { value: "TRIMESTRAL", label: "Trimestral" },
  { value: "SEMESTRAL", label: "Semestral" },
  { value: "ANUAL", label: "Anual" },
];

// Panel de tareas de renovacion — generadas automaticamente por el backend
// (sincronizarTareasRenovacion) para todo cliente en ventana de renovacion,
// una tarea abierta a la vez. "Contactar" cierra la tarea (estado -> el
// mismo EstadoTarea de siempre, reinterpretado aca como "contactado o no").
type FiltroContacto = "todos" | "contactados" | "noContactados";

function TareasRenovacionPanel() {
  const { data, loading, error, refetch } = useTareasRenovacion();
  const [abierto, setAbierto] = useState(true);
  const [periodicidad, setPeriodicidad] = useState<Periodicidad | "">("");
  const [filtroContacto, setFiltroContacto] = useState<FiltroContacto>("todos");
  const [ordenIngresos, setOrdenIngresos] = useState<"asc" | "desc" | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [marcandoId, setMarcandoId] = useState<number | null>(null);

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

  // Por si se marco "Contactado" por error, o hay que volver a contactar a
  // alguien que ya se habia dado por hecho — vuelve al estado inicial, igual
  // que una tarea de renovacion recien generada.
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
    columnaAccionesCliente<TareaRenovacion>(
      (f) => f.cliente.numeroDocumentoCliente,
      setClienteSeleccionado
    ),
    {
      key: "cliente",
      label: "Cliente",
      render: (f) => (
        <ClienteCell
          numeroDocumentoCliente={f.cliente.numeroDocumentoCliente}
          nombreCliente={f.cliente.nombreCliente}
          sistemas={f.cliente.sistemas}
        />
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
        return (
          <Badge tone={dias <= 7 ? "warning" : "neutral"}>{dias} día(s)</Badge>
        );
      },
    },
    {
      key: "ingresos",
      label: "Ingresos mensuales",
      align: "right",
      sortable: true,
      render: (f) =>
        f.cliente.ingresoMensualReal == null ? "—" : formatCurrency(f.cliente.ingresoMensualReal),
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
    {
      key: "contactar",
      label: "",
      align: "center",
      render: (f) =>
        f.tarea.estado === "COMPLETADA" ? (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={marcandoId === f.tarea.id}
            onClick={(event) => {
              event.stopPropagation();
              handleRevertirContacto(f.tarea);
            }}
          >
            {marcandoId === f.tarea.id ? "..." : "Marcar no contactado"}
          </button>
        ) : f.tarea.estado === "CANCELADA" ? (
          <span className="muted">—</span>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={marcandoId === f.tarea.id}
            onClick={(event) => {
              event.stopPropagation();
              handleContactar(f.tarea);
            }}
          >
            {marcandoId === f.tarea.id ? "..." : "Contactar"}
          </button>
        ),
    },
  ];

  return (
    <CollapsibleCard
      titulo="Por renovar — contactar"
      abierto={abierto}
      onToggle={() => setAbierto((v) => !v)}
      contador={filas.length}
      tone="warning"
    >
      <p className="muted">
        Clientes que entraron a la ventana de renovación (mismo criterio que la alerta
        "Renovación próxima") — se generan solos, sin que nadie tenga que crearlos a mano.
      </p>
      <div className="modulo-clientes-periodo">
        <button
          type="button"
          className={periodicidad === "" ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => setPeriodicidad("")}
        >
          Todas
        </button>
        {PERIODICIDADES.map((p) => (
          <button
            key={p.value}
            type="button"
            className={periodicidad === p.value ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setPeriodicidad(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="modulo-clientes-periodo" style={{ marginTop: 8 }}>
        <button
          type="button"
          className={filtroContacto === "todos" ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => setFiltroContacto("todos")}
        >
          Todos
        </button>
        <button
          type="button"
          className={filtroContacto === "noContactados" ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => setFiltroContacto("noContactados")}
        >
          No contactados
        </button>
        <button
          type="button"
          className={filtroContacto === "contactados" ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => setFiltroContacto("contactados")}
        >
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
          setOrdenIngresos((actual) =>
            actual === null ? "desc" : actual === "desc" ? "asc" : null
          );
        }}
        emptyMessage="Sin clientes por renovar en este momento."
      />
      {clienteSeleccionado && (
        <AccionesClienteDrawer
          key={clienteSeleccionado}
          numeroDocumentoCliente={clienteSeleccionado}
          onClose={() => setClienteSeleccionado(null)}
        />
      )}
    </CollapsibleCard>
  );
}

// Sin filtro de "solo con incidencia" en el backend — se trae toda la
// cartera con pageSize grande (mismo patron que Renovaciones.tsx, "no es
// paginado como Clientes") solo para cruzar las 3 señales de incidencia
// reales por numeroDocumentoCliente, no para listar clientes aca.
const CLIENTES_PAGE_SIZE = 1000;

export function TareasPage() {
  const [estado, setEstado] = useState<EstadoTarea | "">("");
  const [soloVencidas, setSoloVencidas] = useState(false);
  const [prioridadAbierta, setPrioridadAbierta] = useState(true);
  const { data, loading, error, refetch } = useTareas({
    estado: estado || undefined,
    vencidas: soloVencidas || undefined,
  });
  const { data: clientesData } = useClientes({ pageSize: CLIENTES_PAGE_SIZE });

  const clientesPorDocumento = useMemo(() => {
    const mapa = new Map<string, PostVentaCliente>();
    for (const c of clientesData?.data ?? []) mapa.set(c.numeroDocumentoCliente, c);
    return mapa;
  }, [clientesData]);

  const columns = useMemo(() => buildColumns(clientesPorDocumento), [clientesPorDocumento]);

  const tareasAbiertas = (data ?? []).filter(
    (t) => t.estado !== "COMPLETADA" && t.estado !== "CANCELADA"
  );
  const tareasPrioritarias = tareasAbiertas.filter((t) =>
    tieneAlertaCritica(clientesPorDocumento.get(t.numeroDocumentoCliente))
  );
  const totalTareas = data?.length ?? 0;
  const completadas = (data ?? []).filter((t) => t.estado === "COMPLETADA").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tareas</h1>
          <div className="page-header-subtitle">Seguimiento propio del equipo de Post Venta</div>
        </div>
      </div>

      <TareasRenovacionPanel />

      {!loading && totalTareas > 0 && (
        <p className="muted" style={{ marginBottom: "var(--space-3)" }}>
          Progreso de este filtro: {completadas}/{totalTareas} completadas
        </p>
      )}

      {tareasPrioritarias.length > 0 && (
        <CollapsibleCard
          titulo="Prioridad: clientes con alerta crítica"
          abierto={prioridadAbierta}
          onToggle={() => setPrioridadAbierta((v) => !v)}
          contador={tareasPrioritarias.length}
          tone="critical"
        >
          <p className="muted">
            Tareas de clientes con al menos una alerta crítica activa (mismo conteo que la
            columna "Alertas" de Cartera) — se priorizan antes que el resto de misiones del día.
            No es el módulo de incidencias de APIWorking, que sigue disponible solo en la ficha
            del cliente hasta que exista el endpoint agregador de Fase 2.
          </p>
          <DataTable
            columns={columns}
            rows={tareasPrioritarias}
            rowKey={(t) => t.id}
            emptyMessage="Sin tareas prioritarias."
          />
        </CollapsibleCard>
      )}

      <h2 style={{ marginTop: "var(--space-5)" }}>Todas las tareas</h2>

      <FilterBar>
        <div className="field">
          <label htmlFor="tareas-estado">Estado</label>
          <select
            id="tareas-estado"
            value={estado}
            onChange={(event) => setEstado(event.target.value as EstadoTarea | "")}
          >
            <option value="">Todos</option>
            {Object.entries(ESTADO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={soloVencidas}
            onChange={(event) => setSoloVencidas(event.target.checked)}
          />
          Solo vencidas
        </label>
      </FilterBar>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      <div className="card">
        <DataTable
          columns={columns}
          rows={data ?? []}
          rowKey={(t) => t.id}
          loading={loading}
          emptyMessage="No hay tareas para este filtro."
        />
      </div>
    </div>
  );
}
