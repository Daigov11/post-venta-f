import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AccionesClienteDrawer } from "../components/panels/AccionesClienteDrawer";
import { ActionMenu, type ActionMenuItem } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { ClienteCell } from "../components/ui/ClienteCell";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { Drawer } from "../components/ui/Drawer";
import { FilterBar } from "../components/ui/FilterBar";
import { Pagination } from "../components/ui/Pagination";
import { SearchInput } from "../components/ui/SearchInput";
import { EstadoOportunidadPill } from "../components/ui/StatusPill";
import { TareaForm, type TareaFormValues } from "../components/forms/TareaForm";
import { useAuth } from "../context/AuthContext";
import { useOportunidades } from "../hooks/useOportunidades";
import { getFichaCliente } from "../services/clientes";
import { createContacto } from "../services/contactos";
import { updateOportunidadEstado } from "../services/oportunidades";
import { createTarea } from "../services/tareas";
import type { ClienteSistemas, EstadoOportunidad, Oportunidad } from "../types/postventaCliente";
import { CrearSeguimientoDialog } from "./clienteFicha/CrearSeguimientoDialog";
import { formatValorEstimado } from "../utils/format";
import { ESTADO_OPORTUNIDAD_LABEL } from "../utils/oportunidadLabels";

const TIPOS = [
  { value: "VENTA_EQUIPO", label: "Venta de equipo" },
  { value: "MIGRACION_PERIODICIDAD", label: "Migración de periodicidad" },
  { value: "CLIENTE_ANTIGUO", label: "Cliente antiguo" },
  { value: "ALTO_VOLUMEN", label: "Alto volumen histórico" },
];

const ESTADOS: { value: EstadoOportunidad; label: string }[] = (
  Object.entries(ESTADO_OPORTUNIDAD_LABEL) as [EstadoOportunidad, string][]
).map(([value, label]) => ({ value, label }));

const PAGE_SIZE = 10;

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

function OportunidadGestionDialog({
  oportunidad,
  onClose,
  onSaved,
  onCrearTarea,
}: {
  oportunidad: Oportunidad;
  onClose: () => void;
  onSaved: () => void;
  onCrearTarea: (oportunidad: Oportunidad) => void;
}) {
  const { username } = useAuth();
  const [estado, setEstado] = useState<EstadoOportunidad>(oportunidad.estado);
  const [responsable, setResponsable] = useState(oportunidad.responsable ?? username ?? "");
  const [siguienteAccion, setSiguienteAccion] = useState(oportunidad.siguienteAccion ?? "");
  const [resultado, setResultado] = useState(oportunidad.resultado ?? "");
  // Solo relevante al marcar GANADA (ver "La Bolsa"): se precarga con
  // valorEstimado cuando el motor ya trae un numero real (hoy solo
  // Migración de periodicidad); para el resto (ej. Venta de equipo, "No
  // determinado") queda vacío y la persona escribe el monto declarado —
  // nunca se inventa un número, y nunca se asume que sea caja verificada.
  const [montoDeclarado, setMontoDeclarado] = useState(
    typeof oportunidad.valorEstimado === "number" ? String(oportunidad.valorEstimado) : ""
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const montoDeclaradoNumero = montoDeclarado.trim() ? Number(montoDeclarado) : null;
      await updateOportunidadEstado(oportunidad.id, {
        numeroDocumentoCliente: oportunidad.cliente,
        estado,
        responsable: responsable.trim() || null,
        siguienteAccion: siguienteAccion.trim() || null,
        resultado: resultado.trim() || null,
        tipo: oportunidad.tipo,
        montoDeclarado: estado === "GANADA" ? montoDeclaradoNumero : null,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{oportunidad.titulo}</h3>
        <p className="muted">{oportunidad.mensaje}</p>
        <p>
          Valor estimado: <strong>{formatValorEstimado(oportunidad.valorEstimado)}</strong>
        </p>
        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="oportunidad-estado">Estado</label>
            <select
              id="oportunidad-estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoOportunidad)}
            >
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="oportunidad-responsable">Responsable</label>
            <input
              id="oportunidad-responsable"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="oportunidad-siguiente">Siguiente acción</label>
            <textarea
              id="oportunidad-siguiente"
              rows={2}
              value={siguienteAccion}
              onChange={(e) => setSiguienteAccion(e.target.value)}
              placeholder="Ej. Llamar para ofrecer plan Anual"
            />
          </div>
          {estado === "GANADA" && (
            <div className="field">
              <label htmlFor="oportunidad-monto-declarado">Monto declarado (S/, opcional)</label>
              <input
                id="oportunidad-monto-declarado"
                type="number"
                min="0"
                step="0.01"
                value={montoDeclarado}
                onChange={(e) => setMontoDeclarado(e.target.value)}
                placeholder="Ej. 350.00"
              />
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Suma a "La Bolsa" del día. Es lo que se declara, no una cifra de caja verificada —
                dejalo vacío si todavía no hay un monto para declarar.
              </p>
            </div>
          )}
          <div className="field">
            <label htmlFor="oportunidad-resultado">
              Resultado {(estado === "GANADA" || estado === "PERDIDA") && "(recomendado)"}
            </label>
            <textarea
              id="oportunidad-resultado"
              rows={2}
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              placeholder="Ej. Cliente aceptó migrar a partir del próximo ciclo"
            />
          </div>
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onCrearTarea(oportunidad)}>
              Crear tarea
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function buildColumns(
  onVerDetalle: (oportunidad: Oportunidad) => void,
  buildAccionesItems: (grupo: ClienteOportunidades) => ActionMenuItem[]
): DataTableColumn<ClienteOportunidades>[] {
  return [
    {
      key: "acciones",
      label: "",
      align: "center",
      render: (g) => <ActionMenu label={`Acciones para ${g.nombreCliente}`} items={buildAccionesItems(g)} />,
    },
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {g.oportunidades.map((o) => (
            <div key={o.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <EstadoOportunidadPill estado={o.estado} />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  onVerDetalle(o);
                }}
              >
                {o.titulo}
              </button>
              {o.responsable && <span className="muted">Responsable: {o.responsable}</span>}
            </div>
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
  const [estado, setEstado] = useState<EstadoOportunidad | "">("");
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useOportunidades({
    tipo: tipo || undefined,
    estado: estado || undefined,
  });
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteOportunidades | null>(null);
  const [oportunidadDetalle, setOportunidadDetalle] = useState<Oportunidad | null>(null);
  const { username } = useAuth();
  const [tareaOportunidadActual, setTareaOportunidadActual] = useState<Oportunidad | null>(null);
  const [tareaInicial, setTareaInicial] = useState<Partial<TareaFormValues>>({});
  const [savingTarea, setSavingTarea] = useState(false);

  // "Crear tarea" generica del ⚙ a nivel cliente (sin una oportunidad
  // puntual seleccionada) — distinta de handleCrearTareaDesdeOportunidad,
  // que sigue ligada a una oportunidad especifica dentro del dialogo de
  // gestion.
  const [tareaClienteActual, setTareaClienteActual] = useState<ClienteOportunidades | null>(null);
  const [savingTareaCliente, setSavingTareaCliente] = useState(false);
  const [seguimientoCliente, setSeguimientoCliente] = useState<ClienteOportunidades | null>(null);

  function handleCrearTareaDesdeOportunidad(o: Oportunidad) {
    setOportunidadDetalle(null);
    setTareaOportunidadActual(o);
    setTareaInicial({
      titulo: `Seguimiento oportunidad: ${o.titulo}`,
      descripcion: o.mensaje,
      responsable: o.responsable || username || "",
      tipo: "OPORTUNIDAD_COMERCIAL",
    });
  }

  async function handleSubmitTarea(values: TareaFormValues) {
    if (!tareaOportunidadActual) return;
    setSavingTarea(true);
    try {
      await createTarea({
        numeroDocumentoCliente: tareaOportunidadActual.cliente,
        tipo: values.tipo,
        origen: "OPORTUNIDAD",
        origenEntidadTipo: "OPORTUNIDAD",
        origenEntidadId: tareaOportunidadActual.id,
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        responsable: values.responsable,
        prioridad: values.prioridad,
        fechaVencimiento: values.fechaVencimiento || null,
      });
      setTareaOportunidadActual(null);
    } finally {
      setSavingTarea(false);
    }
  }

  async function handleSubmitTareaCliente(values: TareaFormValues) {
    if (!tareaClienteActual) return;
    setSavingTareaCliente(true);
    try {
      await createTarea({
        numeroDocumentoCliente: tareaClienteActual.numeroDocumentoCliente,
        tipo: values.tipo,
        origen: "FICHA_CLIENTE",
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        responsable: values.responsable,
        prioridad: values.prioridad,
        fechaVencimiento: values.fechaVencimiento || null,
      });
      setTareaClienteActual(null);
    } finally {
      setSavingTareaCliente(false);
    }
  }

  // Llamar/WhatsApp a nivel de fila (agrupada por cliente) no tienen el
  // telefono/orden ya cargados como PostVentaCliente en otras tablas — se
  // resuelven con el mismo fetch de ficha que ya usa AccionesClienteDrawer,
  // sin agregar ningun endpoint nuevo.
  async function handleLlamar(numeroDocumentoCliente: string) {
    const ficha = await getFichaCliente(numeroDocumentoCliente);
    const limpio = ficha.cliente.telefonoEfectivo?.replace(/\D/g, "");
    if (!limpio) return;
    createContacto({
      numeroDocumentoCliente,
      idOrdenServicio: ficha.cliente.ordenVigente.idOrdenServicio,
      canal: "LLAMADA",
    }).catch(() => {});
    window.location.href = `tel:${limpio}`;
  }

  async function handleWhatsApp(numeroDocumentoCliente: string) {
    const ficha = await getFichaCliente(numeroDocumentoCliente);
    const limpio = ficha.cliente.telefonoEfectivo?.replace(/\D/g, "");
    if (!limpio) return;
    createContacto({
      numeroDocumentoCliente,
      idOrdenServicio: ficha.cliente.ordenVigente.idOrdenServicio,
      canal: "WHATSAPP",
    }).catch(() => {});
    window.open(`https://wa.me/51${limpio}`, "_blank", "noreferrer");
  }

  function buildAccionesItems(grupo: ClienteOportunidades): ActionMenuItem[] {
    return [
      { key: "agendar", label: "Agendar / Interés", onSelect: () => setClienteSeleccionado(grupo) },
      { key: "ficha", label: "Abrir ficha", to: `/clientes/${grupo.numeroDocumentoCliente}` },
      {
        key: "crear-tarea",
        label: "Crear tarea",
        onSelect: () => setTareaClienteActual(grupo),
      },
      { key: "llamar", label: "Llamar", onSelect: () => handleLlamar(grupo.numeroDocumentoCliente) },
      { key: "whatsapp", label: "WhatsApp", onSelect: () => handleWhatsApp(grupo.numeroDocumentoCliente) },
      {
        key: "seguimiento",
        label: "Registrar seguimiento",
        onSelect: () => setSeguimientoCliente(grupo),
      },
    ];
  }

  // Busqueda por nombre/RUC — se hace en el cliente porque la lista completa
  // ya esta cargada para armar la tabla; no hace falta otro viaje al backend.
  // Se filtra sobre las oportunidades sueltas (no ya agrupadas) porque la
  // paginacion de abajo cuenta oportunidades, no clientes.
  const filtroBusqueda = search.trim().toLowerCase();
  const oportunidadesFiltradas = useMemo(() => {
    const todas = data?.data ?? [];
    if (!filtroBusqueda) return todas;
    return todas.filter(
      (o) =>
        o.nombreCliente.toLowerCase().includes(filtroBusqueda) ||
        o.cliente.toLowerCase().includes(filtroBusqueda)
    );
  }, [data, filtroBusqueda]);

  const [page, setPage] = useState(1);

  // Cambiar cualquier filtro vuelve a la pagina 1 — si no, se podria quedar
  // en una pagina 4 que ya no existe para el nuevo filtro.
  useEffect(() => {
    setPage(1);
  }, [filtroBusqueda, tipo, estado]);

  const totalPaginas = Math.max(1, Math.ceil(oportunidadesFiltradas.length / PAGE_SIZE));

  // Caso distinto al de arriba: la lista puede achicarse sin que el usuario
  // toque ningun filtro (ej. gestiono una oportunidad y el filtro de Estado
  // ya no la incluye, tras el refetch) — si la pagina actual quedo vacia, se
  // ajusta a la ultima pagina valida en vez de mostrar una tabla en blanco.
  useEffect(() => {
    setPage((actual) => (actual > totalPaginas ? totalPaginas : actual));
  }, [totalPaginas]);

  // La tabla sigue agrupando por cliente (un cliente puede tener varias
  // oportunidades a la vez) pero el agrupado se aplica DESPUES de paginar,
  // solo sobre las 10 oportunidades de la pagina actual — la paginacion en
  // si cuenta oportunidades, tal como pide "10 oportunidades por pagina", no
  // clientes. Consecuencia aceptada: un cliente con oportunidades justo en
  // el borde de una pagina puede aparecer en las dos paginas contiguas, cada
  // vez con un subconjunto distinto.
  const oportunidadesPagina = useMemo(
    () => oportunidadesFiltradas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [oportunidadesFiltradas, page]
  );
  const clientesPagina = useMemo(() => agruparPorCliente(oportunidadesPagina), [oportunidadesPagina]);

  function handleLimpiarTodo() {
    setSearch("");
    setTipo("");
    setEstado("");
  }

  const columns = useMemo(
    () => buildColumns(setOportunidadDetalle, buildAccionesItems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Oportunidades</h1>
          <div className="page-header-subtitle">
            Oportunidades comerciales detectadas con los datos disponibles — un cliente puede
            tener varias a la vez, agrupadas en una sola fila. Hacé clic en cualquiera para
            gestionarla (estado, responsable, siguiente acción y resultado).
          </div>
        </div>
      </div>

      <FilterBar>
        <div className="field">
          <label htmlFor="oportunidades-busqueda">Buscar</label>
          <SearchInput
            id="oportunidades-busqueda"
            value={search}
            onChange={setSearch}
            placeholder="Nombre o RUC del cliente..."
          />
        </div>
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
        <div className="field">
          <label htmlFor="oportunidades-estado">Estado</label>
          <select
            id="oportunidades-estado"
            value={estado}
            onChange={(event) => setEstado(event.target.value as EstadoOportunidad | "")}
          >
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <DataTable
          columns={columns}
          rows={clientesPagina}
          rowKey={(g) => g.numeroDocumentoCliente}
          loading={loading}
          stickyFirstColumn
          emptyMessage={
            filtroBusqueda || tipo || estado ? (
              <span>
                No hay oportunidades que coincidan con la búsqueda y los filtros aplicados.{" "}
                <button type="button" className="btn btn-ghost" onClick={handleLimpiarTodo}>
                  Limpiar búsqueda y filtros
                </button>
              </span>
            ) : (
              "No hay oportunidades para este filtro."
            )
          }
        />
      </div>

      {!loading && oportunidadesFiltradas.length > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={oportunidadesFiltradas.length}
          onPageChange={setPage}
          itemLabel="oportunidades"
        />
      )}

      {clienteSeleccionado && (
        <AccionesClienteDrawer
          key={clienteSeleccionado.numeroDocumentoCliente}
          numeroDocumentoCliente={clienteSeleccionado.numeroDocumentoCliente}
          origen={{
            modulo: "OPORTUNIDADES",
            etiqueta: "Oportunidades",
            entidadTipo: "CLIENTE",
            entidadId: clienteSeleccionado.numeroDocumentoCliente,
          }}
          onClose={() => setClienteSeleccionado(null)}
        />
      )}

      {oportunidadDetalle && (
        <OportunidadGestionDialog
          oportunidad={oportunidadDetalle}
          onClose={() => setOportunidadDetalle(null)}
          onSaved={refetch}
          onCrearTarea={handleCrearTareaDesdeOportunidad}
        />
      )}

      <Drawer
        open={tareaOportunidadActual !== null}
        onClose={() => setTareaOportunidadActual(null)}
        title={tareaOportunidadActual ? `Tarea — ${tareaOportunidadActual.nombreCliente}` : "Nueva tarea"}
      >
        <TareaForm
          key={tareaOportunidadActual?.id ?? "closed"}
          initial={tareaInicial}
          onSubmit={handleSubmitTarea}
          onCancel={() => setTareaOportunidadActual(null)}
          submitting={savingTarea}
        />
      </Drawer>

      <Drawer
        open={tareaClienteActual !== null}
        onClose={() => setTareaClienteActual(null)}
        title={tareaClienteActual ? `Crear tarea — ${tareaClienteActual.nombreCliente}` : undefined}
      >
        <TareaForm
          initial={{ responsable: username ?? "", tipo: "SEGUIMIENTO" }}
          onSubmit={handleSubmitTareaCliente}
          onCancel={() => setTareaClienteActual(null)}
          submitting={savingTareaCliente}
        />
      </Drawer>

      {seguimientoCliente && (
        <CrearSeguimientoDialog
          numeroDocumentoCliente={seguimientoCliente.numeroDocumentoCliente}
          onClose={() => setSeguimientoCliente(null)}
          onCreado={() => setSeguimientoCliente(null)}
        />
      )}
    </div>
  );
}
