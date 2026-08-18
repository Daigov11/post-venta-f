import { useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { FilterBar } from "../components/ui/FilterBar";
import { useOportunidades } from "../hooks/useOportunidades";
import type { Oportunidad } from "../types/postventaCliente";
import { formatValorEstimado } from "../utils/format";

const TIPOS = [
  { value: "VENTA_EQUIPO", label: "Venta de equipo" },
  { value: "MIGRACION_PERIODICIDAD", label: "Migración de periodicidad" },
  { value: "CLIENTE_ANTIGUO", label: "Cliente antiguo" },
  { value: "ALTO_VOLUMEN", label: "Alto volumen histórico" },
];

const columns: DataTableColumn<Oportunidad>[] = [
  { key: "titulo", label: "Oportunidad", render: (o) => <strong>{o.titulo}</strong> },
  { key: "mensaje", label: "Detalle", render: (o) => o.mensaje },
  {
    key: "cliente",
    label: "Cliente",
    render: (o) => <Link to={`/clientes/${o.cliente}`}>{o.nombreCliente}</Link>,
  },
  {
    key: "valor",
    label: "Valor estimado",
    align: "right",
    render: (o) => formatValorEstimado(o.valorEstimado),
  },
];

export function OportunidadesPage() {
  const [tipo, setTipo] = useState("");
  const { data, loading, error } = useOportunidades({ tipo: tipo || undefined });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Oportunidades</h1>
          <div className="page-header-subtitle">
            Oportunidades comerciales detectadas con los datos disponibles
          </div>
        </div>
      </div>

      <FilterBar>
        <div className="field">
          <label htmlFor="oportunidades-tipo">Tipo</label>
          <select id="oportunidades-tipo" value={tipo} onChange={(event) => setTipo(event.target.value)}>
            <option value="">Todos</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(o) => o.id}
          loading={loading}
          emptyMessage="No hay oportunidades para este filtro."
        />
      </div>
    </div>
  );
}
