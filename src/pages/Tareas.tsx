import { useMemo, useState } from "react";
import { AccionesClienteDrawer } from "../components/panels/AccionesClienteDrawer";
import { ActionMenu, type ActionMenuItem } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { ClienteCell } from "../components/ui/ClienteCell";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { FilterBar } from "../components/ui/FilterBar";
import { KpiCard } from "../components/ui/KpiCard";
import { SearchInput } from "../components/ui/SearchInput";
import { useAuth } from "../context/AuthContext";
import { useCarteraMensual } from "../hooks/useCarteraMensual";
import { updateTarea } from "../services/tareas";
import type { TareaCarteraMensual } from "../types/postventaCliente";
import { formatFechaCorta } from "../utils/format";
import { CarteraMensualPanel } from "./tareas/CarteraMensualPanel";
import { esAbierta, hoyIso } from "./tareas/helpers";
import "./Tareas.css";

const MS_DIA = 86_400_000;

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

  const hoy = hoyIso();

  const { urgentes, deHoy } = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = (data?.data ?? []).filter(
      (f) =>
        !q ||
        f.cliente.numeroDocumentoCliente.toLowerCase().includes(q) ||
        f.cliente.nombreCliente.toLowerCase().includes(q)
    );
    const urgentes = base
      .filter((f) => esAbierta(f.tarea) && f.tarea.fechaVencimiento !== null && f.tarea.fechaVencimiento < hoy)
      .sort((a, b) => (a.tarea.fechaVencimiento ?? "").localeCompare(b.tarea.fechaVencimiento ?? ""));
    // Las hechas hoy quedan visibles, al final, para ver el avance del dia.
    const deHoy = base
      .filter((f) => f.tarea.fechaVencimiento === hoy)
      .sort((a, b) => Number(!esAbierta(a.tarea)) - Number(!esAbierta(b.tarea)));
    return { urgentes, deHoy };
  }, [data, busqueda, hoy]);

  const hechasHoy = deHoy.filter((f) => !esAbierta(f.tarea)).length;

  async function cambiarEstado(id: number, estado: "COMPLETADA" | "EN_PROCESO") {
    setMarcandoId(id);
    try {
      await updateTarea(id, { estado });
      refetch();
    } finally {
      setMarcandoId(null);
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
        </div>
      )}

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
        <KpiCard label="Para hoy" value={deHoy.length} hint={`${hechasHoy} contactado(s)`} />
      </div>

      <FilterBar>
        <div className="field">
          <label htmlFor="tareas-busqueda">Cliente o RUC</label>
          <SearchInput id="tareas-busqueda" value={busqueda} onChange={setBusqueda} placeholder="Buscar..." />
        </div>
      </FilterBar>

      {urgentes.length > 0 && (
        <section className="card tareas-seccion tareas-seccion-urgente" aria-label="Tareas urgentes">
          <h2 className="tareas-seccion-titulo">Urgentes — días anteriores sin hacer ({urgentes.length})</h2>
          <DataTable
            columns={columnas(true)}
            rows={urgentes}
            rowKey={(f) => f.tarea.id}
            loading={loading}
            stickyFirstColumn
          />
        </section>
      )}

      <section className="card tareas-seccion" aria-label="Tareas de hoy">
        <h2 className="tareas-seccion-titulo">Hoy — {formatFechaCorta(hoy)}</h2>
        <DataTable
          columns={columnas(false)}
          rows={deHoy}
          rowKey={(f) => f.tarea.id}
          loading={loading}
          emptyMessage={alcance === "mias" ? "No tienes contactos asignados para hoy." : "No hay contactos asignados para hoy."}
          stickyFirstColumn
        />
      </section>

      {esAdmin && <CarteraMensualPanel />}

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
