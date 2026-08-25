import { useMemo, useState } from "react";
import { AccionesClienteDrawer, columnaAccionesCliente } from "../components/panels/AccionesClienteDrawer";
import { ClienteCell } from "../components/ui/ClienteCell";
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

function buildColumns(
  onAbrirAcciones: (numeroDocumentoCliente: string) => void
): DataTableColumn<Oportunidad>[] {
  return [
    columnaAccionesCliente<Oportunidad>((o) => o.cliente, onAbrirAcciones),
    { key: "titulo", label: "Oportunidad", render: (o) => <strong>{o.titulo}</strong> },
    { key: "mensaje", label: "Detalle", render: (o) => o.mensaje },
    {
      key: "cliente",
      label: "Cliente",
      render: (o) => (
        <ClienteCell
          numeroDocumentoCliente={o.cliente}
          nombreCliente={o.nombreCliente}
          sistemas={o.sistemas}
        />
      ),
    },
    {
      key: "valor",
      label: "Valor estimado",
      align: "right",
      render: (o) => formatValorEstimado(o.valorEstimado),
    },
  ];
}

export function OportunidadesPage() {
  const [tipo, setTipo] = useState("");
  const { data, loading, error } = useOportunidades({ tipo: tipo || undefined });
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const columns = useMemo(() => buildColumns(setClienteSeleccionado), []);

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

      {clienteSeleccionado && (
        <AccionesClienteDrawer
          key={clienteSeleccionado}
          numeroDocumentoCliente={clienteSeleccionado}
          onClose={() => setClienteSeleccionado(null)}
        />
      )}
    </div>
  );
}
