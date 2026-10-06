import { useMemo, useState } from "react";
import { AccionesClienteDrawer } from "../components/panels/AccionesClienteDrawer";
import { ActionMenu, type ActionMenuItem } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { ClienteCell } from "../components/ui/ClienteCell";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { FilterBar } from "../components/ui/FilterBar";
import { KpiCard } from "../components/ui/KpiCard";
import { SearchInput } from "../components/ui/SearchInput";
import { useAuth } from "../context/AuthContext";
import { useCarteraMensual } from "../hooks/useCarteraMensual";
import { reconstruirCarteraMensual, updateTarea } from "../services/tareas";
import type { TareaCarteraMensual } from "../types/postventaCliente";
import { buildContactoMenuItems } from "../utils/contactoMenuItems";
import { formatFechaCorta } from "../utils/format";
import { esAbierta, hoyIso } from "./tareas/helpers";
import "./Tareas.css";

const MS_DIA = 86_400_000;

type Vista = "pendientes" | "seguimiento" | "contactados";

// Fecha LOCAL (YYYY-MM-DD) de un timestamp ISO — para saber si algo se hizo hoy.
function fechaLocalDe(timestamp: string): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diasDeAtraso(fecha: string, hoy: string): number {
  return Math.round((Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${fecha}T00:00:00Z`)) / MS_DIA);
}

// Bandeja diaria: SOLO los contactos asignados (no la lista general de
// tareas). Muestra lo de HOY y, arriba y en rojo, lo de dias anteriores que
// sigue sin hacerse. Lo de fechas futuras no aparece hasta que llegue su dia.
// Cada persona ve solo lo suyo; un ADMIN puede alternar a ver las de todos.
export function TareasPage() {
  const { rol } = useAuth();
  const esAdmin = rol === "ADMIN";
  const [alcance, setAlcance] = useState<"todas" | "mias">("mias");
  const { data, loading, error, refetch } = useCarteraMensual(alcance);
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [marcandoId, setMarcandoId] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista>("pendientes");
  const [responsableFiltro, setResponsableFiltro] = useState("");
  const [confirmandoReconstruir, setConfirmandoReconstruir] = useState(false);
  const [reconstruyendo, setReconstruyendo] = useState(false);
  const [resultadoReconstruir, setResultadoReconstruir] = useState<string | null>(null);

  const hoy = hoyIso();

  // Tres vistas, como filtro: lo POR HACER (urgentes de dias anteriores en
  // rojo + lo de hoy), lo que quedo EN SEGUIMIENTO (de cualquier fecha, para
  // que no se pierda al marcarlo) y lo ya CONTACTADO hoy.
  const { urgentes, deHoy, enSeguimiento, contactados } = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = (data?.data ?? []).filter(
      (f) =>
        (!responsableFiltro || f.tarea.responsable === responsableFiltro) &&
        (!q ||
          f.cliente.numeroDocumentoCliente.toLowerCase().includes(q) ||
          f.cliente.nombreCliente.toLowerCase().includes(q))
    );
    const porFecha = (a: TareaCarteraMensual, b: TareaCarteraMensual) =>
      (a.tarea.fechaVencimiento ?? "").localeCompare(b.tarea.fechaVencimiento ?? "");
    const pendientes = base.filter((f) => f.tarea.estado === "PENDIENTE");
    return {
      urgentes: pendientes.filter((f) => f.tarea.fechaVencimiento !== null && f.tarea.fechaVencimiento < hoy).sort(porFecha),
      deHoy: pendientes.filter((f) => f.tarea.fechaVencimiento === hoy),
      enSeguimiento: base.filter((f) => f.tarea.estado === "EN_PROCESO").sort(porFecha),
      contactados: base.filter(
        (f) =>
          f.tarea.estado === "COMPLETADA" &&
          (f.tarea.fechaVencimiento === hoy || fechaLocalDe(f.tarea.updatedAt) === hoy)
      ),
    };
  }, [data, busqueda, responsableFiltro, hoy]);

  const responsables = useMemo(
    () => [...new Set((data?.data ?? []).map((f) => f.tarea.responsable))].sort((a, b) => a.localeCompare(b)),
    [data]
  );

  async function cambiarEstado(id: number, estado: "COMPLETADA" | "EN_PROCESO") {
    setMarcandoId(id);
    try {
      await updateTarea(id, { estado });
      refetch();
    } finally {
      setMarcandoId(null);
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
      refetch();
    } catch {
      setResultadoReconstruir("No se pudo reconstruir el reparto. Intenta de nuevo.");
    } finally {
      setReconstruyendo(false);
    }
  }

  function columnas(conAtraso: boolean): DataTableColumn<TareaCarteraMensual>[] {
    return [
      {
        key: "acciones",
        label: "",
        align: "center",
        render: (f) => {
          const t = f.tarea;
          const items: ActionMenuItem[] = [
            {
              key: "agendar",
              label: "Agendar / Interés",
              onSelect: () => setClienteSeleccionado(f.cliente.numeroDocumentoCliente),
            },
          ];
          if (esAbierta(t)) {
            items.push({
              key: "contactar",
              label: "Marcar como contactado",
              disabled: marcandoId === t.id,
              onSelect: () => cambiarEstado(t.id, "COMPLETADA"),
            });
            if (t.estado !== "EN_PROCESO") {
              items.push({
                key: "seguimiento",
                label: "Marcar en seguimiento",
                disabled: marcandoId === t.id,
                onSelect: () => cambiarEstado(t.id, "EN_PROCESO"),
              });
            }
          }
          items.push(
            ...buildContactoMenuItems({
              numeroDocumentoCliente: f.cliente.numeroDocumentoCliente,
              idOrdenServicio: t.idOrdenServicio,
              telefonoLimpio: f.cliente.telefonoEfectivo,
            })
          );
          items.push({ key: "ficha", label: "Abrir ficha", to: `/clientes/${f.cliente.numeroDocumentoCliente}` });
          return <ActionMenu label={`Acciones para ${f.cliente.nombreCliente}`} items={items} />;
        },
      },
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
      {
        // Igual que en Clientes: el numero es informacion visible; Llamar y
        // WhatsApp estan en el menu de la fila.
        key: "telefono",
        label: "Teléfono",
        render: (f) =>
          f.cliente.telefonoEfectivo ? <span>{f.cliente.telefonoEfectivo}</span> : <span className="muted">—</span>,
      },
      { key: "plan", label: "Plan", render: (f) => f.cliente.periodicidad },
      {
        key: "motivo",
        label: "Motivo",
        render: (f) => <span className="muted">{f.tarea.descripcion ?? "—"}</span>,
      },
      {
        key: "fecha",
        label: conAtraso ? "Debía hacerse" : "Fecha",
        render: (f) => {
          const fecha = f.tarea.fechaVencimiento;
          if (!fecha) return "—";
          if (!conAtraso) return formatFechaCorta(fecha);
          const dias = diasDeAtraso(fecha, hoy);
          return (
            <span className="tareas-atraso">
              {formatFechaCorta(fecha)} · hace {dias} día{dias === 1 ? "" : "s"}
            </span>
          );
        },
      },
      { key: "responsable", label: "Responsable", render: (f) => <Badge tone="info">{f.tarea.responsable}</Badge> },
      {
        key: "estado",
        label: "Estado",
        render: (f) =>
          f.tarea.estado === "COMPLETADA" ? (
            <Badge tone="success">Contactado</Badge>
          ) : f.tarea.estado === "EN_PROCESO" ? (
            <Badge tone="info">En seguimiento</Badge>
          ) : conAtraso ? (
            <Badge tone="critical">Urgente</Badge>
          ) : (
            <Badge tone="neutral">Pendiente</Badge>
          ),
      },
    ];
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tareas</h1>
          <div className="page-header-subtitle">
            {alcance === "mias" ? "Tus contactos asignados" : "Contactos asignados a todo el equipo"} · hoy{" "}
            {formatFechaCorta(hoy)}
          </div>
        </div>
      </div>

      {esAdmin && (
        <div className="toolbar-row" style={{ marginBottom: "var(--space-3)" }}>
          <button type="button" className={alcance === "mias" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setAlcance("mias")}>
            Mis tareas
          </button>
          <button type="button" className={alcance === "todas" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setAlcance("todas")}>
            Ver todas
          </button>
          <button type="button" className="btn btn-ghost" disabled={reconstruyendo} onClick={() => setConfirmandoReconstruir(true)}>
            {reconstruyendo ? "Reconstruyendo..." : "Reconstruir reparto del mes"}
          </button>
        </div>
      )}
      {resultadoReconstruir && <p role="status">{resultadoReconstruir}</p>}

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      <div className="tareas-kpis">
        <KpiCard label="Urgentes (días anteriores)" value={urgentes.length} tone={urgentes.length > 0 ? "critical" : undefined} />
        <KpiCard label="Para hoy" value={deHoy.length} hint={`${contactados.length} contactado(s) hoy`} />
      </div>

      <div className="segmented-control tareas-vista-tabs" role="tablist" aria-label="Vista de las tareas">
        <button type="button" role="tab" aria-selected={vista === "pendientes"} className={vista === "pendientes" ? "activo" : ""} onClick={() => setVista("pendientes")}>
          Pendientes ({urgentes.length + deHoy.length})
        </button>
        <button type="button" role="tab" aria-selected={vista === "seguimiento"} className={vista === "seguimiento" ? "activo" : ""} onClick={() => setVista("seguimiento")}>
          En seguimiento ({enSeguimiento.length})
        </button>
        <button type="button" role="tab" aria-selected={vista === "contactados"} className={vista === "contactados" ? "activo" : ""} onClick={() => setVista("contactados")}>
          Contactados hoy ({contactados.length})
        </button>
      </div>

      <FilterBar>
        <div className="field">
          <label htmlFor="tareas-busqueda">Cliente o RUC</label>
          <SearchInput id="tareas-busqueda" value={busqueda} onChange={setBusqueda} placeholder="Buscar..." />
        </div>
        {esAdmin && alcance === "todas" && (
          <div className="field">
            <label htmlFor="tareas-responsable">Responsable</label>
            <select id="tareas-responsable" value={responsableFiltro} onChange={(e) => setResponsableFiltro(e.target.value)}>
              <option value="">Todos</option>
              {responsables.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}
      </FilterBar>

      {vista === "pendientes" && (
        <>
          {urgentes.length > 0 && (
            <section className="card tareas-seccion tareas-seccion-urgente" aria-label="Tareas urgentes">
              <h2 className="tareas-seccion-titulo">Urgentes — días anteriores sin hacer ({urgentes.length})</h2>
              <DataTable columns={columnas(true)} rows={urgentes} rowKey={(f) => f.tarea.id} loading={loading} stickyFirstColumn />
            </section>
          )}
          <section className="card tareas-seccion" aria-label="Tareas de hoy">
            <h2 className="tareas-seccion-titulo">Hoy — {formatFechaCorta(hoy)}</h2>
            <DataTable
              columns={columnas(false)}
              rows={deHoy}
              rowKey={(f) => f.tarea.id}
              loading={loading}
              emptyMessage={alcance === "mias" ? "No tienes contactos pendientes para hoy." : "No hay contactos pendientes para hoy."}
              stickyFirstColumn
            />
          </section>
        </>
      )}

      {vista === "seguimiento" && (
        <section className="card tareas-seccion" aria-label="Tareas en seguimiento">
          <h2 className="tareas-seccion-titulo">En seguimiento ({enSeguimiento.length})</h2>
          <DataTable
            columns={columnas(false)}
            rows={enSeguimiento}
            rowKey={(f) => f.tarea.id}
            loading={loading}
            emptyMessage="No hay contactos en seguimiento."
            stickyFirstColumn
          />
        </section>
      )}

      {vista === "contactados" && (
        <section className="card tareas-seccion" aria-label="Contactados hoy">
          <h2 className="tareas-seccion-titulo">Contactados hoy ({contactados.length})</h2>
          <DataTable
            columns={columnas(false)}
            rows={contactados}
            rowKey={(f) => f.tarea.id}
            loading={loading}
            emptyMessage="Todavía no hay contactos marcados como contactados hoy."
            stickyFirstColumn
          />
        </section>
      )}

      <ConfirmDialog
        open={confirmandoReconstruir}
        title="Reconstruir el reparto del mes"
        message="Aplica las reglas actuales a los contactos del mes que siguen PENDIENTES: los reubica según el plan del cliente y la carga del equipo, y cancela los de clientes que ya no están en INICIAR COBRANZA o a quienes no les toca contacto este mes. No toca los ya contactados ni los en seguimiento, ni borra nada."
        confirmLabel="Reconstruir"
        danger
        onConfirm={handleReconstruir}
        onCancel={() => setConfirmandoReconstruir(false)}
      />

      {clienteSeleccionado && (
        <AccionesClienteDrawer
          key={clienteSeleccionado}
          numeroDocumentoCliente={clienteSeleccionado}
          origen={{ modulo: "TAREAS", etiqueta: "Contacto del día", entidadTipo: "CLIENTE", entidadId: clienteSeleccionado }}
          onClose={() => setClienteSeleccionado(null)}
        />
      )}
    </div>
  );
}
