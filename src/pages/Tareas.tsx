import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { FilterBar } from "../components/ui/FilterBar";
import { useTareas } from "../hooks/useTareas";
import type { EstadoTarea, Tarea } from "../types/postventaCliente";

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

const columns: DataTableColumn<Tarea>[] = [
  { key: "titulo", label: "Tarea", render: (t) => <strong>{t.titulo}</strong> },
  {
    key: "cliente",
    label: "Cliente",
    render: (t) => (
      <Link to={`/clientes/${t.numeroDocumentoCliente}`}>{t.numeroDocumentoCliente}</Link>
    ),
  },
  { key: "responsable", label: "Responsable", render: (t) => t.responsable },
  { key: "prioridad", label: "Prioridad", render: (t) => t.prioridad },
  {
    key: "estado",
    label: "Estado",
    render: (t) => <Badge tone={ESTADO_TONE[t.estado]}>{ESTADO_LABEL[t.estado]}</Badge>,
  },
  { key: "vencimiento", label: "Vence", render: (t) => t.fechaVencimiento ?? "—" },
];

export function TareasPage() {
  const [estado, setEstado] = useState<EstadoTarea | "">("");
  const [soloVencidas, setSoloVencidas] = useState(false);
  const { data, loading, error } = useTareas({
    estado: estado || undefined,
    vencidas: soloVencidas || undefined,
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tareas</h1>
          <div className="page-header-subtitle">Seguimiento propio del equipo de Post Venta</div>
        </div>
      </div>

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

      {error && <p className="error-text">{error}</p>}

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
