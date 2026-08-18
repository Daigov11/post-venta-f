import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InteresesReunionesPanel } from "../components/panels/InteresesReunionesPanel";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { Drawer } from "../components/ui/Drawer";
import { FilterBar } from "../components/ui/FilterBar";
import { Skeleton } from "../components/ui/Skeleton";
import { NivelAlertaPill } from "../components/ui/StatusPill";
import { useAlertas } from "../hooks/useAlertas";
import { useCliente } from "../hooks/useCliente";
import type { Alerta, NivelAlerta } from "../types/postventaCliente";

// Mismos tipos que emite el motor de alertas (ver alertaRules en
// backend/src/engines/alertas.engine.ts) + REUNION_PROXIMA, que se agrega
// aparte en el controller. Si se agrega una regla nueva hay que sumarla aca
// tambien — no hay un endpoint que liste los tipos posibles.
const TIPOS_ALERTA: { value: string; label: string }[] = [
  { value: "DEUDA_PENDIENTE", label: "Deuda pendiente" },
  { value: "SIN_EQUIPO", label: "Cliente sin equipo" },
  { value: "DOCUMENTACION_INCOMPLETA", label: "Documentación incompleta" },
  { value: "SIN_COMPROBANTES", label: "Sin comprobantes emitidos" },
  { value: "ANIVERSARIO", label: "Aniversario de antigüedad" },
  { value: "RENOVACION_PROXIMA", label: "Renovación próxima" },
  { value: "SIN_ACTIVIDAD_RECIENTE", label: "Sin actividad reciente" },
  { value: "REUNION_PROXIMA", label: "Reunión próxima" },
];

const NIVEL_RANK: Record<NivelAlerta, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 };

interface ClienteAlertas {
  numeroDocumentoCliente: string;
  nombreCliente: string;
  alertas: Alerta[];
  peorNivel: NivelAlerta;
}

// Un mismo cliente suele disparar varias alertas a la vez (deuda + sin
// equipo, por ejemplo) — antes aparecia una fila por alerta, repitiendo el
// cliente N veces. Agrupamos para que cada cliente aparezca una sola vez,
// con todas sus alertas juntas.
function agruparPorCliente(alertas: Alerta[]): ClienteAlertas[] {
  const mapa = new Map<string, ClienteAlertas>();
  for (const a of alertas) {
    let grupo = mapa.get(a.cliente);
    if (!grupo) {
      grupo = {
        numeroDocumentoCliente: a.cliente,
        nombreCliente: a.nombreCliente,
        alertas: [],
        peorNivel: a.nivel,
      };
      mapa.set(a.cliente, grupo);
    }
    grupo.alertas.push(a);
    if (NIVEL_RANK[a.nivel] > NIVEL_RANK[grupo.peorNivel]) grupo.peorNivel = a.nivel;
  }
  return [...mapa.values()].sort((x, y) => {
    const porNivel = NIVEL_RANK[y.peorNivel] - NIVEL_RANK[x.peorNivel];
    if (porNivel !== 0) return porNivel;
    return y.alertas.length - x.alertas.length;
  });
}

// Fetchea la ficha del cliente recien al abrir el drawer (no de antemano
// para toda la lista) — se monta/desmonta con key=numeroDocumentoCliente asi
// que cada apertura arranca su propio fetch.
function AccionesClienteDrawer({
  numeroDocumentoCliente,
  onClose,
}: {
  numeroDocumentoCliente: string;
  onClose: () => void;
}) {
  const { data, loading, error, refetch } = useCliente(numeroDocumentoCliente);

  return (
    <Drawer open onClose={onClose} title={data ? data.cliente.nombreCliente : "Cliente"}>
      {loading && !data && <Skeleton height={220} />}
      {error && <p className="error-text">{error}</p>}
      {data && (
        <InteresesReunionesPanel
          numeroDocumentoCliente={data.cliente.numeroDocumentoCliente}
          idOrdenServicio={data.cliente.ordenVigente.idOrdenServicio}
          ejecutivoDefault={data.cliente.ordenVigente.ejecutivo}
          catalogo={data.intereses.catalogo}
          marcados={data.intereses.marcados}
          reuniones={data.reuniones}
          onChanged={refetch}
        />
      )}
    </Drawer>
  );
}

export function AlertasPage() {
  const [nivel, setNivel] = useState<NivelAlerta | "">("");
  const [tipo, setTipo] = useState("");
  const { data, loading, error } = useAlertas({ nivel: nivel || undefined, tipo: tipo || undefined });
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);

  const clientes = useMemo(() => agruparPorCliente(data?.data ?? []), [data]);

  const columns: DataTableColumn<ClienteAlertas>[] = useMemo(
    () => [
      { key: "nivel", label: "Peor nivel", render: (g) => <NivelAlertaPill nivel={g.peorNivel} /> },
      {
        key: "cliente",
        label: "Cliente",
        render: (g) => <Link to={`/clientes/${g.numeroDocumentoCliente}`}>{g.nombreCliente}</Link>,
      },
      { key: "ruc", label: "RUC/DNI", render: (g) => g.numeroDocumentoCliente },
      {
        key: "cantidad",
        label: "Alertas",
        align: "center",
        render: (g) => g.alertas.length,
      },
      {
        key: "detalle",
        label: "Detalle",
        render: (g) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {g.alertas.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <NivelAlertaPill nivel={a.nivel} />
                <span>
                  <strong>{a.titulo}</strong> — {a.mensaje}
                </span>
              </div>
            ))}
          </div>
        ),
      },
      {
        key: "acciones",
        label: "Acciones",
        align: "center",
        render: (g) => (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setClienteSeleccionado(g.numeroDocumentoCliente)}
          >
            Reunión / interés
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Alertas</h1>
          <div className="page-header-subtitle">
            Situaciones detectadas automáticamente en la cartera — un cliente puede tener
            varias alertas a la vez, agrupadas en una sola fila.
          </div>
        </div>
      </div>

      <FilterBar>
        <div className="field">
          <label htmlFor="alertas-nivel">Nivel</label>
          <select
            id="alertas-nivel"
            value={nivel}
            onChange={(event) => setNivel(event.target.value as NivelAlerta | "")}
          >
            <option value="">Todos</option>
            <option value="CRITICAL">Crítico</option>
            <option value="WARNING">Advertencia</option>
            <option value="INFO">Info</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="alertas-tipo">Tipo</label>
          <select id="alertas-tipo" value={tipo} onChange={(event) => setTipo(event.target.value)}>
            <option value="">Todos</option>
            {TIPOS_ALERTA.map((t) => (
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
          emptyMessage="No hay alertas para este filtro."
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
