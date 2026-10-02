import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { AccionesClienteDrawer } from "../components/panels/AccionesClienteDrawer";
import { CrearIncidenciaDialog } from "../components/panels/CrearIncidenciaDialog";
import { TareaForm, type TareaFormValues } from "../components/forms/TareaForm";
import { ActionMenu, type ActionMenuItem } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { ClienteCell } from "../components/ui/ClienteCell";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { Drawer } from "../components/ui/Drawer";
import { FilterBar } from "../components/ui/FilterBar";
import { KpiCard } from "../components/ui/KpiCard";
import { Pagination } from "../components/ui/Pagination";
import { SearchInput } from "../components/ui/SearchInput";
import { useAuth } from "../context/AuthContext";
import { useRecuperacion } from "../hooks/useRecuperacion";
import { getFichaCliente } from "../services/clientes";
import { createContacto } from "../services/contactos";
import { actualizarEpisodioRecuperacion } from "../services/recuperacion";
import { createTarea } from "../services/tareas";
import type {
  EpisodioRecuperacion,
  EstadoRecuperacion,
  OrigenRecuperacion,
} from "../types/postventaCliente";
import {
  ESTADO_RECUPERACION_LABEL,
  ESTADO_RECUPERACION_TONE,
  ORIGEN_RECUPERACION_LABEL,
  ORIGEN_RECUPERACION_TONE,
} from "../utils/recuperacionLabels";
import { formatCurrency } from "../utils/format";

const PAGE_SIZE = 10;

function diasRestantes(fechaLimite: string | null): number | null {
  if (!fechaLimite) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  const ms = new Date(`${fechaLimite}T00:00:00Z`).getTime() - new Date(`${hoy}T00:00:00Z`).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function ReasignarDialog({
  episodio,
  onClose,
  onReasignado,
}: {
  episodio: EpisodioRecuperacion;
  onClose: () => void;
  onReasignado: () => void;
}) {
  const [responsable, setResponsable] = useState(episodio.responsable ?? "");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!responsable.trim()) return;
    setEnviando(true);
    try {
      await actualizarEpisodioRecuperacion(episodio.id, { responsable: responsable.trim() });
      onReasignado();
      onClose();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Reasignar — {episodio.nombreCliente}</h3>
        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="recuperacion-responsable">Responsable</label>
            <input
              id="recuperacion-responsable"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={enviando || !responsable.trim()}>
              {enviando ? "Guardando..." : "Reasignar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RecuperacionPage() {
  const { username } = useAuth();
  // Deep-link desde Tareas ("Ver episodio de recuperación relacionado") —
  // ?cliente=<numeroDocumentoCliente>, solo se lee una vez al montar.
  const [searchParams] = useSearchParams();
  const [origen, setOrigen] = useState<OrigenRecuperacion | "">("");
  const [estado, setEstado] = useState<EstadoRecuperacion | "">("");
  const [responsable, setResponsable] = useState("");
  const [busqueda, setBusqueda] = useState(() => searchParams.get("cliente") ?? "");
  const [page, setPage] = useState(1);

  const { data, loading, error, refetch } = useRecuperacion({
    origen: origen || undefined,
    estado: estado || undefined,
    responsable: responsable || undefined,
    cliente: busqueda || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const [agendarEpisodio, setAgendarEpisodio] = useState<EpisodioRecuperacion | null>(null);
  const [incidenciaEpisodio, setIncidenciaEpisodio] = useState<EpisodioRecuperacion | null>(null);
  const [reasignarEpisodio, setReasignarEpisodio] = useState<EpisodioRecuperacion | null>(null);
  const [tareaEpisodio, setTareaEpisodio] = useState<EpisodioRecuperacion | null>(null);
  const [savingTarea, setSavingTarea] = useState(false);

  async function handleMarcar(episodio: EpisodioRecuperacion, nuevoEstado: "RECUPERADO" | "PERDIDO") {
    await actualizarEpisodioRecuperacion(episodio.id, { estado: nuevoEstado });
    refetch();
  }

  async function handleLlamar(episodio: EpisodioRecuperacion) {
    const ficha = await getFichaCliente(episodio.numeroDocumentoCliente);
    const limpio = ficha.cliente.telefonoEfectivo?.replace(/\D/g, "");
    if (!limpio) return;
    createContacto({
      numeroDocumentoCliente: episodio.numeroDocumentoCliente,
      idOrdenServicio: episodio.idOrdenServicio,
      canal: "LLAMADA",
    }).catch(() => {});
    window.location.href = `tel:${limpio}`;
  }

  async function handleWhatsApp(episodio: EpisodioRecuperacion) {
    const ficha = await getFichaCliente(episodio.numeroDocumentoCliente);
    const limpio = ficha.cliente.telefonoEfectivo?.replace(/\D/g, "");
    if (!limpio) return;
    createContacto({
      numeroDocumentoCliente: episodio.numeroDocumentoCliente,
      idOrdenServicio: episodio.idOrdenServicio,
      canal: "WHATSAPP",
    }).catch(() => {});
    window.open(`https://wa.me/51${limpio}`, "_blank", "noreferrer");
  }

  async function handleSubmitTarea(values: TareaFormValues) {
    if (!tareaEpisodio) return;
    setSavingTarea(true);
    try {
      await createTarea({
        numeroDocumentoCliente: tareaEpisodio.numeroDocumentoCliente,
        idOrdenServicio: tareaEpisodio.idOrdenServicio,
        origen: "RECUPERACION",
        origenEntidadTipo: "RECUPERACION_EPISODIO",
        origenEntidadId: String(tareaEpisodio.id),
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        responsable: values.responsable,
        prioridad: values.prioridad,
        tipo: values.tipo,
        fechaVencimiento: values.fechaVencimiento || null,
      });
      setTareaEpisodio(null);
    } finally {
      setSavingTarea(false);
    }
  }

  function buildItems(episodio: EpisodioRecuperacion): ActionMenuItem[] {
    const items: ActionMenuItem[] = [
      { key: "agendar", label: "Agendar / Interés", onSelect: () => setAgendarEpisodio(episodio) },
      { key: "ficha", label: "Abrir ficha", to: `/clientes/${episodio.numeroDocumentoCliente}` },
      { key: "llamar", label: "Llamar", onSelect: () => handleLlamar(episodio) },
      { key: "whatsapp", label: "WhatsApp", onSelect: () => handleWhatsApp(episodio) },
      { key: "crear-tarea", label: "Crear tarea", onSelect: () => setTareaEpisodio(episodio) },
      { key: "generar-incidencia", label: "Generar incidencia", onSelect: () => setIncidenciaEpisodio(episodio) },
    ];
    if (episodio.estado === "EN_RECUPERACION" || episodio.estado === "PENDIENTE_VALIDACION") {
      items.push(
        { key: "marcar-recuperado", label: "Marcar recuperado", onSelect: () => handleMarcar(episodio, "RECUPERADO") },
        { key: "marcar-perdido", label: "Marcar perdido", onSelect: () => handleMarcar(episodio, "PERDIDO") }
      );
    }
    items.push({ key: "reasignar", label: "Reasignar", onSelect: () => setReasignarEpisodio(episodio) });
    return items;
  }

  const columns: DataTableColumn<EpisodioRecuperacion>[] = [
    {
      key: "acciones",
      label: "",
      align: "center",
      render: (e) => <ActionMenu label={`Acciones para ${e.nombreCliente}`} items={buildItems(e)} />,
    },
    { key: "orden", label: "Sistema / Orden", render: (e) => <span className="muted">{e.idOrdenServicio}</span> },
    {
      key: "cliente",
      label: "Cliente / RUC",
      render: (e) => (
        <ClienteCell
          numeroDocumentoCliente={e.numeroDocumentoCliente}
          nombreCliente={e.nombreCliente}
          sistemas={null}
        />
      ),
    },
    {
      key: "origen",
      label: "Origen",
      render: (e) => <Badge tone={ORIGEN_RECUPERACION_TONE[e.origen]}>{ORIGEN_RECUPERACION_LABEL[e.origen]}</Badge>,
    },
    {
      key: "monto",
      label: "Monto / Deuda",
      align: "right",
      render: (e) => (e.monto !== null ? formatCurrency(e.monto) : <span className="muted">—</span>),
    },
    {
      key: "ingreso",
      label: "Fecha de ingreso",
      render: (e) => e.fechaIngreso ?? <span className="muted">Sin confirmar</span>,
    },
    {
      key: "restantes",
      label: "Días restantes",
      align: "right",
      render: (e) => {
        const dias = diasRestantes(e.fechaLimite);
        if (dias === null) return <span className="muted">—</span>;
        return <Badge tone={dias < 0 ? "critical" : dias <= 7 ? "warning" : "neutral"}>{dias}</Badge>;
      },
    },
    { key: "responsable", label: "Responsable", render: (e) => e.responsable ?? <span className="muted">—</span> },
    {
      key: "estado",
      label: "Estado",
      render: (e) => <Badge tone={ESTADO_RECUPERACION_TONE[e.estado]}>{ESTADO_RECUPERACION_LABEL[e.estado]}</Badge>,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Recuperación</h1>
          <div className="page-header-subtitle">
            Cola de órdenes en recuperación por renovación impaga, suspensión o baja — la unidad es la
            orden de servicio, no el cliente.
          </div>
        </div>
      </div>

      {data && (
        <div className="kpi-grid">
          <KpiCard label="En recuperación" value={data.resumen.enRecuperacion} tone="warning" />
          <KpiCard label="Por vencer (≤7 días)" value={data.resumen.porVencer} tone="critical" />
          <KpiCard label="Recuperados" value={data.resumen.recuperados} tone="success" />
          <KpiCard label="Perdidos" value={data.resumen.perdidos} />
        </div>
      )}

      <FilterBar>
        <div className="field">
          <label htmlFor="recuperacion-busqueda">Cliente o RUC</label>
          <SearchInput
            id="recuperacion-busqueda"
            value={busqueda}
            onChange={(v) => {
              setBusqueda(v);
              setPage(1);
            }}
            placeholder="Buscar..."
          />
        </div>
        <div className="field">
          <label htmlFor="recuperacion-origen">Origen</label>
          <select
            id="recuperacion-origen"
            value={origen}
            onChange={(e) => {
              setOrigen(e.target.value as OrigenRecuperacion | "");
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {(Object.entries(ORIGEN_RECUPERACION_LABEL) as [OrigenRecuperacion, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="recuperacion-estado">Estado</label>
          <select
            id="recuperacion-estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoRecuperacion | "");
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {(Object.entries(ESTADO_RECUPERACION_LABEL) as [EstadoRecuperacion, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="recuperacion-responsable">Responsable</label>
          <input
            id="recuperacion-responsable"
            value={responsable}
            onChange={(e) => {
              setResponsable(e.target.value);
              setPage(1);
            }}
            placeholder="Nombre..."
          />
        </div>
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
          rows={data?.data ?? []}
          rowKey={(e) => e.id}
          loading={loading}
          stickyFirstColumn
          emptyMessage="No hay episodios de recuperación para este filtro."
        />
      </div>

      {data && data.total > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} itemLabel="episodio(s)" />
      )}

      {agendarEpisodio && (
        <AccionesClienteDrawer
          key={agendarEpisodio.id}
          numeroDocumentoCliente={agendarEpisodio.numeroDocumentoCliente}
          origen={{
            modulo: "RECUPERACION",
            etiqueta: `Recuperación: ${ORIGEN_RECUPERACION_LABEL[agendarEpisodio.origen]}`,
            entidadTipo: "RECUPERACION_EPISODIO",
            entidadId: agendarEpisodio.id,
          }}
          onClose={() => setAgendarEpisodio(null)}
        />
      )}

      {incidenciaEpisodio && (
        <CrearIncidenciaDialog
          numeroDocumentoCliente={incidenciaEpisodio.numeroDocumentoCliente}
          clienteInfo={{
            nombre: incidenciaEpisodio.nombreCliente,
            ruc: incidenciaEpisodio.numeroDocumentoCliente,
            ordenVigente: incidenciaEpisodio.idOrdenServicio,
          }}
          tituloInicial={`Recuperación: ${ORIGEN_RECUPERACION_LABEL[incidenciaEpisodio.origen]}`}
          descripcionInicial={incidenciaEpisodio.motivo ?? undefined}
          onClose={() => setIncidenciaEpisodio(null)}
          onCreada={() => setIncidenciaEpisodio(null)}
        />
      )}

      {reasignarEpisodio && (
        <ReasignarDialog
          episodio={reasignarEpisodio}
          onClose={() => setReasignarEpisodio(null)}
          onReasignado={refetch}
        />
      )}

      <Drawer
        open={tareaEpisodio !== null}
        onClose={() => setTareaEpisodio(null)}
        title={tareaEpisodio ? `Crear tarea — ${tareaEpisodio.nombreCliente}` : undefined}
      >
        <TareaForm
          initial={{ responsable: username ?? "", tipo: "SEGUIMIENTO" }}
          onSubmit={handleSubmitTarea}
          onCancel={() => setTareaEpisodio(null)}
          submitting={savingTarea}
        />
      </Drawer>
    </div>
  );
}
