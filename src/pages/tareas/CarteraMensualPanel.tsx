import { useMemo, useState } from "react";
import { AccionesClienteDrawer } from "../../components/panels/AccionesClienteDrawer";
import { ActionMenu, type ActionMenuItem } from "../../components/ui/ActionMenu";
import { Badge } from "../../components/ui/Badge";
import { ClienteCell } from "../../components/ui/ClienteCell";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { FilterBar } from "../../components/ui/FilterBar";
import { Pagination } from "../../components/ui/Pagination";
import { SearchInput } from "../../components/ui/SearchInput";
import { useAuth } from "../../context/AuthContext";
import { useCarteraMensual } from "../../hooks/useCarteraMensual";
import { reconstruirCarteraMensual, redistribuirCarteraMensual, updateTarea } from "../../services/tareas";
import type { TareaCarteraMensual } from "../../types/postventaCliente";
import { hoyIso } from "./helpers";

const PAGE_SIZE = 10;

type FiltroEstado = "todos" | "contactados" | "noContactados" | "pendientesDeRedistribuir";

// "Pendiente de redistribuir" es un estado DERIVADO (no existe como valor de
// EstadoTarea) — una tarea de reparto que sigue PENDIENTE con una fecha ya
// pasada, candidata a moverse a un dia habil futuro (ver
// redistribuirPendientesDelPeriodo en el backend). Nunca se muestra como
// una "vencida" mas: son contactos rutinarios que tocaba reprogramar, no
// trabajo urgente real.
function esPendienteDeRedistribuir(f: TareaCarteraMensual, hoy: string): boolean {
  return f.tarea.estado === "PENDIENTE" && f.tarea.fechaVencimiento !== null && f.tarea.fechaVencimiento < hoy;
}

export function CarteraMensualPanel() {
  const { rol } = useAuth();
  const esAdmin = rol === "ADMIN";
  const [abierto, setAbierto] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  // Solo el ADMIN elige: ve todas o solo las suyas. El resto siempre recibe
  // solo las suyas, filtradas en el backend.
  const [alcance, setAlcance] = useState<"todas" | "mias">("todas");
  const { data, loading, error, refetch } = useCarteraMensual(alcance, refreshToken);
  const [confirmandoReconstruir, setConfirmandoReconstruir] = useState(false);
  const [reconstruyendo, setReconstruyendo] = useState(false);
  const [resultadoReconstruir, setResultadoReconstruir] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [responsableFiltro, setResponsableFiltro] = useState("");
  const [diaFiltro, setDiaFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>("todos");
  const [page, setPage] = useState(1);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [marcandoId, setMarcandoId] = useState<number | null>(null);
  const [redistribuyendo, setRedistribuyendo] = useState(false);

  const hoy = hoyIso();
  const filas = useMemo(() => data?.data ?? [], [data]);
  const resumen = data?.resumen;

  const responsables = useMemo(
    () => [...new Set(filas.map((f) => f.tarea.responsable))].sort((a, b) => a.localeCompare(b)),
    [filas]
  );
  const dias = useMemo(
    () => [...new Set(filas.map((f) => f.tarea.fechaVencimiento).filter((d): d is string => d !== null))].sort(),
    [filas]
  );

  const filasFiltradas = useMemo(() => {
    let base = filas;
    if (responsableFiltro) base = base.filter((f) => f.tarea.responsable === responsableFiltro);
    if (diaFiltro) base = base.filter((f) => f.tarea.fechaVencimiento === diaFiltro);
    if (estadoFiltro === "contactados") base = base.filter((f) => f.tarea.estado === "COMPLETADA");
    else if (estadoFiltro === "pendientesDeRedistribuir") base = base.filter((f) => esPendienteDeRedistribuir(f, hoy));
    else if (estadoFiltro === "noContactados")
      base = base.filter((f) => f.tarea.estado !== "COMPLETADA" && !esPendienteDeRedistribuir(f, hoy));
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      base = base.filter(
        (f) =>
          f.cliente.numeroDocumentoCliente.toLowerCase().includes(q) ||
          f.cliente.nombreCliente.toLowerCase().includes(q)
      );
    }
    return [...base].sort((a, b) => (a.tarea.fechaVencimiento ?? "").localeCompare(b.tarea.fechaVencimiento ?? ""));
  }, [filas, responsableFiltro, diaFiltro, estadoFiltro, busqueda, hoy]);

  const filasPagina = filasFiltradas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleContactar(tarea: TareaCarteraMensual["tarea"]) {
    setMarcandoId(tarea.id);
    try {
      await updateTarea(tarea.id, { estado: "COMPLETADA" });
      refetch();
    } finally {
      setMarcandoId(null);
    }
  }

  async function handleRedistribuir() {
    setRedistribuyendo(true);
    try {
      await redistribuirCarteraMensual();
      setRefreshToken((v) => v + 1);
    } finally {
      setRedistribuyendo(false);
    }
  }

  async function handleReconstruir() {
    setConfirmandoReconstruir(false);
    setReconstruyendo(true);
    try {
      const r = await reconstruirCarteraMensual();
      setResultadoReconstruir(
        `Reparto reconstruido: ${r.nuevas} nueva(s), ${r.replanificadas} reubicada(s), ${r.canceladas} cancelada(s).`
      );
      setRefreshToken((v) => v + 1);
    } catch {
      setResultadoReconstruir("No se pudo reconstruir el reparto. Intenta de nuevo.");
    } finally {
      setReconstruyendo(false);
    }
  }

  const columnas: DataTableColumn<TareaCarteraMensual>[] = [
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
    { key: "periodicidad", label: "Plan", render: (f) => f.cliente.periodicidad },
    { key: "dia", label: "Día asignado", render: (f) => f.tarea.fechaVencimiento ?? "—" },
    { key: "responsable", label: "Responsable", render: (f) => <Badge tone="info">{f.tarea.responsable}</Badge> },
    {
      key: "estado",
      label: "Estado",
      render: (f) =>
        f.tarea.estado === "COMPLETADA" ? (
          <Badge tone="success">Contactado</Badge>
        ) : esPendienteDeRedistribuir(f, hoy) ? (
          <Badge tone="pending">Pendiente de redistribuir</Badge>
        ) : f.tarea.estado === "EN_PROCESO" ? (
          <Badge tone="info">En seguimiento</Badge>
        ) : (
          <Badge tone="neutral">Pendiente</Badge>
        ),
    },
  ];

  return (
    <CollapsibleCard
      titulo="Cartera mensual"
      abierto={abierto}
      onToggle={() => setAbierto((v) => !v)}
      contador={resumen?.total ?? 0}
      tone="neutral"
    >
      <p className="muted">
        Clientes en estado INICIAR COBRANZA, contactados según su plan: mensuales una vez al mes; semestrales
        y anuales cada 2 meses hasta su renovación (la renovación misma y los trimestrales salen en "Por
        renovar"). La carga se reparte en partes iguales entre los días hábiles (lunes a sábado) y entre las
        personas marcadas en Configuración.
      </p>
      {esAdmin && (
        <div className="toolbar-row">
          <button type="button" className={alcance === "todas" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setAlcance("todas")}>
            Todas las tareas
          </button>
          <button type="button" className={alcance === "mias" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setAlcance("mias")}>
            Solo las mías
          </button>
          <button type="button" className="btn btn-secondary" disabled={reconstruyendo} onClick={() => setConfirmandoReconstruir(true)}>
            {reconstruyendo ? "Reconstruyendo..." : "Reconstruir reparto"}
          </button>
        </div>
      )}
      {resultadoReconstruir && <p role="status">{resultadoReconstruir}</p>}
      {resumen && (
        <div className="cartera-mensual-resumen">
          <div className="cartera-mensual-metrica">
            <strong>{resumen.contactados}</strong> / {resumen.total}
            <span className="muted"> contactados</span>
          </div>
          <div className="cartera-mensual-metrica">
            <strong>{resumen.noContactados}</strong>
            <span className="muted"> no contactados</span>
          </div>
          <div className="cartera-mensual-metrica">
            <strong>{resumen.pendientesDeRedistribuir}</strong>
            <span className="muted"> pendientes de redistribuir</span>
          </div>
          {resumen.pendientesDeRedistribuir > 0 && (
            <button type="button" className="btn btn-secondary" disabled={redistribuyendo} onClick={handleRedistribuir}>
              {redistribuyendo ? "Redistribuyendo..." : `Redistribuir ${resumen.pendientesDeRedistribuir} pendiente(s)`}
            </button>
          )}
        </div>
      )}

      {resumen && resumen.porResponsable.length > 0 && (
        <div className="cartera-mensual-resumen">
          {resumen.porResponsable.map((r) => (
            <div key={r.responsable} className="cartera-mensual-metrica">
              <strong>{r.responsable}</strong>: {r.contactados}/{r.total}
              <span className="muted"> contactados</span>
            </div>
          ))}
        </div>
      )}

      {resumen && resumen.porDia.length > 0 && (
        <details className="cartera-mensual-distribucion">
          <summary>Distribución por día hábil ({resumen.porDia.length} días)</summary>
          <div className="cartera-mensual-dias">
            {resumen.porDia.map((d) => (
              <div key={d.fecha} className="cartera-mensual-dia">
                <span className="mono">{d.fecha}</span>
                <span>
                  {d.contactados}/{d.total}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      <FilterBar>
        <div className="field">
          <label htmlFor="cartera-busqueda">Cliente o RUC</label>
          <SearchInput id="cartera-busqueda" value={busqueda} onChange={setBusqueda} placeholder="Buscar..." />
        </div>
        <div className="field">
          <label htmlFor="cartera-responsable">Responsable</label>
          <select id="cartera-responsable" value={responsableFiltro} onChange={(event) => setResponsableFiltro(event.target.value)}>
            <option value="">Todos</option>
            {responsables.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cartera-dia">Día asignado</label>
          <select id="cartera-dia" value={diaFiltro} onChange={(event) => setDiaFiltro(event.target.value)}>
            <option value="">Todos</option>
            {dias.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cartera-estado">Estado</label>
          <select id="cartera-estado" value={estadoFiltro} onChange={(event) => setEstadoFiltro(event.target.value as FiltroEstado)}>
            <option value="todos">Todos</option>
            <option value="contactados">Contactados</option>
            <option value="noContactados">No contactados</option>
            <option value="pendientesDeRedistribuir">Pendientes de redistribuir</option>
          </select>
        </div>
      </FilterBar>

      <DataTable
        columns={columnas}
        rows={filasPagina}
        rowKey={(f) => f.tarea.id}
        loading={loading}
        emptyMessage="Sin clientes para este filtro."
        stickyFirstColumn
      />
      {filasFiltradas.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Pagination page={page} pageSize={PAGE_SIZE} total={filasFiltradas.length} onPageChange={setPage} itemLabel="cliente(s)" />
        </div>
      )}

      <ConfirmDialog
        open={confirmandoReconstruir}
        title="Reconstruir el reparto del mes"
        message="Aplica las reglas actuales a las tareas de contacto del mes que siguen PENDIENTES: las reubica según el plan del cliente y la carga del equipo, y cancela las de clientes que ya no están en INICIAR COBRANZA o a quienes no les toca contacto este mes. No toca las completadas ni las en seguimiento, ni borra nada."
        confirmLabel="Reconstruir"
        danger
        onConfirm={handleReconstruir}
        onCancel={() => setConfirmandoReconstruir(false)}
      />

      {clienteSeleccionado && (
        <AccionesClienteDrawer
          key={clienteSeleccionado}
          numeroDocumentoCliente={clienteSeleccionado}
          origen={{ modulo: "TAREAS", etiqueta: "Cartera mensual", entidadTipo: "CLIENTE", entidadId: clienteSeleccionado }}
          onClose={() => setClienteSeleccionado(null)}
        />
      )}
    </CollapsibleCard>
  );
}
