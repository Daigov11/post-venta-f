import { useMemo, useState } from "react";
import { AccionesClienteDrawer, columnaAccionesCliente } from "../components/panels/AccionesClienteDrawer";
import { Badge } from "../components/ui/Badge";
import { ClienteCell } from "../components/ui/ClienteCell";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { FilterBar } from "../components/ui/FilterBar";
import { useOportunidades } from "../hooks/useOportunidades";
import type { ClienteSistemas, Oportunidad } from "../types/postventaCliente";
import { formatValorEstimado } from "../utils/format";

const TIPOS = [
  { value: "VENTA_EQUIPO", label: "Venta de equipo" },
  { value: "MIGRACION_PERIODICIDAD", label: "Migración de periodicidad" },
  { value: "CLIENTE_ANTIGUO", label: "Cliente antiguo" },
  { value: "ALTO_VOLUMEN", label: "Alto volumen histórico" },
];

interface ClienteOportunidades {
  numeroDocumentoCliente: string;
  nombreCliente: string;
  sistemas: ClienteSistemas;
  oportunidades: Oportunidad[];
  valorTotalEstimado: number | "No determinado";
}

// Un mismo cliente suele tener varias oportunidades a la vez — antes aparecia
// una fila por oportunidad, repitiendo el cliente N veces. Agrupamos para que
// cada cliente aparezca una sola vez, con todas sus oportunidades juntas.
function agruparPorCliente(oportunidades: Oportunidad[]): ClienteOportunidades[] {
  const mapa = new Map<string, ClienteOportunidades>();
  for (const o of oportunidades) {
    let grupo = mapa.get(o.cliente);
    if (!grupo) {
      grupo = {
        numeroDocumentoCliente: o.cliente,
        nombreCliente: o.nombreCliente,
        sistemas: o.sistemas,
        oportunidades: [],
        valorTotalEstimado: 0,
      };
      mapa.set(o.cliente, grupo);
    }
    grupo.oportunidades.push(o);
    // No se inventa un total si alguna oportunidad no tiene valor determinado
    // — se marca todo el grupo como "No determinado" en vez de sumar solo
    // las que si tienen numero (eso subestimaria el valor real en juego).
    if (grupo.valorTotalEstimado !== "No determinado") {
      grupo.valorTotalEstimado =
        o.valorEstimado === "No determinado" ? "No determinado" : grupo.valorTotalEstimado + o.valorEstimado;
    }
  }
  return [...mapa.values()].sort((x, y) => y.oportunidades.length - x.oportunidades.length);
}

function OportunidadDetalleDialog({
  oportunidad,
  onClose,
}: {
  oportunidad: Oportunidad;
  onClose: () => void;
}) {
  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{oportunidad.titulo}</h3>
        <p className="muted">{oportunidad.mensaje}</p>
        <p>
          Valor estimado: <strong>{formatValorEstimado(oportunidad.valorEstimado)}</strong>
        </p>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function buildColumns(
  onAbrirAcciones: (numeroDocumentoCliente: string) => void,
  onVerDetalle: (oportunidad: Oportunidad) => void
): DataTableColumn<ClienteOportunidades>[] {
  return [
    columnaAccionesCliente<ClienteOportunidades>(
      (g) => g.numeroDocumentoCliente,
      onAbrirAcciones
    ),
    {
      key: "cliente",
      label: "Cliente",
      render: (g) => (
        <ClienteCell
          numeroDocumentoCliente={g.numeroDocumentoCliente}
          nombreCliente={g.nombreCliente}
          sistemas={g.sistemas}
        />
      ),
    },
    {
      key: "oportunidades",
      label: "Oportunidades",
      render: (g) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {g.oportunidades.map((o) => (
            <button
              key={o.id}
              type="button"
              className="btn btn-secondary"
              onClick={(event) => {
                event.stopPropagation();
                onVerDetalle(o);
              }}
            >
              {o.titulo}
            </button>
          ))}
        </div>
      ),
    },
    {
      key: "cantidad",
      label: "Cantidad",
      align: "center",
      render: (g) => g.oportunidades.length,
    },
    {
      key: "valor",
      label: "Valor estimado",
      align: "right",
      render: (g) => <Badge tone="success">{formatValorEstimado(g.valorTotalEstimado)}</Badge>,
    },
  ];
}

export function OportunidadesPage() {
  const [tipo, setTipo] = useState("");
  const { data, loading, error } = useOportunidades({ tipo: tipo || undefined });
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [oportunidadDetalle, setOportunidadDetalle] = useState<Oportunidad | null>(null);

  const clientes = useMemo(() => agruparPorCliente(data?.data ?? []), [data]);
  const columns = useMemo(
    () => buildColumns(setClienteSeleccionado, setOportunidadDetalle),
    []
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Oportunidades</h1>
          <div className="page-header-subtitle">
            Oportunidades comerciales detectadas con los datos disponibles — un cliente puede
            tener varias a la vez, agrupadas en una sola fila. Hacé clic en cualquiera para ver el
            detalle.
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
          rows={clientes}
          rowKey={(g) => g.numeroDocumentoCliente}
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

      {oportunidadDetalle && (
        <OportunidadDetalleDialog
          oportunidad={oportunidadDetalle}
          onClose={() => setOportunidadDetalle(null)}
        />
      )}
    </div>
  );
}
