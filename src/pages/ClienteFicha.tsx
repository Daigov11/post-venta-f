import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { NotaForm } from "../components/forms/NotaForm";
import { TareaForm, type TareaFormValues } from "../components/forms/TareaForm";
import { InteresesReunionesPanel } from "../components/panels/InteresesReunionesPanel";
import { SeguimientoPostVentaDrawer } from "../components/panels/SeguimientoPostVentaDrawer";
import { ActionMenu } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { Drawer } from "../components/ui/Drawer";
import { Skeleton } from "../components/ui/Skeleton";
import { EstadoPostVentaPill, SegmentoPill } from "../components/ui/StatusPill";
import { useAuth } from "../context/AuthContext";
import { useCliente } from "../hooks/useCliente";
import { uploadAdjuntos } from "../services/adjuntos";
import { getCapacitaciones } from "../services/capacitaciones";
import { refreshSystemUsersOne, updateClienteMetadata } from "../services/clientes";
import { getHistorialSeguimiento } from "../services/historial";
import { getIncidencias } from "../services/incidencias";
import { createNota } from "../services/notas";
import { createTarea } from "../services/tareas";
import { buildContactoMenuItems } from "../utils/contactoMenuItems";
import type {
  Capacitacion,
  EstadoPostVenta,
  HistorialSeguimientoEvento,
  Incidencia,
} from "../types/postventaCliente";
import { CobranzaTab } from "./clienteFicha/CobranzaTab";
import { HistorialTab } from "./clienteFicha/HistorialTab";
import { IncidenciasTab, type FiltroIncidencias } from "./clienteFicha/IncidenciasTab";
import { NotasTab } from "./clienteFicha/NotasTab";
import { OportunidadesTab } from "./clienteFicha/OportunidadesTab";
import { RenovacionTab } from "./clienteFicha/RenovacionTab";
import { ResumenTab } from "./clienteFicha/ResumenTab";
import { ServiciosTab } from "./clienteFicha/ServiciosTab";
import { TareasTab } from "./clienteFicha/TareasTab";
import "./ClienteFicha.css";

// Orden y nombres pedidos en la limpieza visual de Fase 1: resumen, cobranza,
// servicios, incidencias, renovación, tareas, oportunidades, contactos/notas
// e historial — cada uno su propia pestaña, sin mezclar incidencias externas
// con notas/tareas internas. Antes "Resumen" repartia estas mismas secciones
// en 3 bloques no contiguos del archivo; esto es reordenamiento puro, ningun
// dato ni calculo cambio.
type FichaTab =
  | "resumen"
  | "cobranza"
  | "servicios"
  | "incidencias"
  | "renovacion"
  | "tareas"
  | "oportunidades"
  | "notas"
  | "historial";

const FICHA_TABS_VALIDAS: FichaTab[] = [
  "resumen",
  "cobranza",
  "servicios",
  "incidencias",
  "renovacion",
  "tareas",
  "oportunidades",
  "notas",
  "historial",
];

const TABS: { value: FichaTab; label: (counts: { tareas: number; notas: number }) => string }[] = [
  { value: "resumen", label: () => "Resumen" },
  { value: "cobranza", label: () => "Cobranza" },
  { value: "servicios", label: () => "Servicios" },
  { value: "incidencias", label: () => "Incidencias" },
  { value: "renovacion", label: () => "Renovación" },
  { value: "tareas", label: (c) => `Tareas (${c.tareas})` },
  { value: "oportunidades", label: () => "Oportunidades" },
  { value: "notas", label: (c) => `Notas y contactos (${c.notas})` },
  { value: "historial", label: () => "Historial" },
];

export function ClienteFichaPage() {
  const navigate = useNavigate();
  const { numeroDocumentoCliente = "" } = useParams();
  const { username } = useAuth();
  const { data, loading, error, refetch } = useCliente(numeroDocumentoCliente);
  const [searchParams] = useSearchParams();
  const tabInicial = searchParams.get("tab");
  const [tab, setTab] = useState<FichaTab>(
    tabInicial && FICHA_TABS_VALIDAS.includes(tabInicial as FichaTab) ? (tabInicial as FichaTab) : "resumen"
  );
  const [notaDrawerOpen, setNotaDrawerOpen] = useState(false);
  const [tareaDrawerOpen, setTareaDrawerOpen] = useState(false);
  // Prefill del formulario de tarea — vacio (solo responsable) desde el
  // boton genérico de la cabecera, o con título/descripción de una
  // incidencia puntual cuando se crea desde esa fila (ver pestaña
  // Incidencias). Hallazgo de la auditoría de Fase 1: antes "Crear tarea"
  // era siempre genérico, sin enlace real a la incidencia que lo origina —
  // tareaDesdeIncidencia guarda esa incidencia puntual para que
  // handleAddTarea pueda mandar origen=INCIDENCIA + la referencia real
  // (origenEntidadId), no solo texto libre en el título.
  const [tareaInicial, setTareaInicial] = useState<Partial<TareaFormValues>>({});
  const [tareaDesdeIncidencia, setTareaDesdeIncidencia] = useState<Incidencia | null>(null);
  const [interesesDrawerOpen, setInteresesDrawerOpen] = useState(false);
  const [seguimientoPvDrawerOpen, setSeguimientoPvDrawerOpen] = useState(false);
  const [savingNota, setSavingNota] = useState(false);
  const [savingTarea, setSavingTarea] = useState(false);

  const [segmentoManual, setSegmentoManual] = useState("");
  const [etiquetasText, setEtiquetasText] = useState("");
  const [observacionGeneral, setObservacionGeneral] = useState("");
  const [estadoManual, setEstadoManual] = useState<EstadoPostVenta | "">("");
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [refreshingTrabajadores, setRefreshingTrabajadores] = useState(false);
  const [editingTelefono, setEditingTelefono] = useState(false);
  const [telefonoInput, setTelefonoInput] = useState("");
  const [savingTelefono, setSavingTelefono] = useState(false);

  const [historial, setHistorial] = useState<HistorialSeguimientoEvento[] | null>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);

  const [incidenciasResp, setIncidenciasResp] = useState<{
    data: Incidencia[];
    total: number;
    abiertas: number;
    resueltas: number;
  } | null>(null);
  const [loadingIncidencias, setLoadingIncidencias] = useState(false);
  const [errorIncidencias, setErrorIncidencias] = useState<string | null>(null);
  const [filtroIncidencias, setFiltroIncidencias] = useState<FiltroIncidencias>("todas");

  // A diferencia de incidencias (llamada en vivo a APIWorking, cara, se pide
  // solo si el usuario hace clic), capacitaciones ya viene precalculado por
  // el sync diario — es una consulta local barata, se carga sola.
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[] | null>(null);
  const [loadingCapacitaciones, setLoadingCapacitaciones] = useState(false);

  useEffect(() => {
    setCapacitaciones(null);
    if (!numeroDocumentoCliente) return;
    setLoadingCapacitaciones(true);
    getCapacitaciones(numeroDocumentoCliente)
      .then(setCapacitaciones)
      .catch(() => setCapacitaciones([]))
      .finally(() => setLoadingCapacitaciones(false));
  }, [numeroDocumentoCliente]);

  const [usuarioCopiado, setUsuarioCopiado] = useState<string | null>(null);
  async function handleCopiar(texto: string, marcador: string) {
    await navigator.clipboard.writeText(texto);
    setUsuarioCopiado(marcador);
    setTimeout(() => setUsuarioCopiado((actual) => (actual === marcador ? null : actual)), 1500);
  }

  async function handleSaveTelefono() {
    setSavingTelefono(true);
    try {
      await updateClienteMetadata(numeroDocumentoCliente, {
        telefonoManual: telefonoInput.trim() || null,
      });
      setEditingTelefono(false);
      refetch();
    } finally {
      setSavingTelefono(false);
    }
  }

  async function handleRefreshTrabajadores() {
    setRefreshingTrabajadores(true);
    try {
      await refreshSystemUsersOne(numeroDocumentoCliente);
      refetch();
    } finally {
      setRefreshingTrabajadores(false);
    }
  }

  useEffect(() => {
    if (!data) return;
    setSegmentoManual(data.cliente.segmentoManual ?? "");
    setEtiquetasText(data.cliente.etiquetas.join(", "));
    setObservacionGeneral(data.cliente.observacionGeneral ?? "");
    setEstadoManual(data.cliente.estadoPostVentaManual ?? "");
    setTelefonoInput(data.cliente.telefonoEfectivo ?? "");
  }, [data]);

  // Se resetea al cambiar de cliente para no arrastrar el historial del
  // anterior mientras carga el nuevo (el fetch es manual, no automatico).
  // La pestaña NO se resetea en el montaje inicial (comparando contra el
  // cliente anterior, no contando invocaciones — React.StrictMode corre
  // este efecto 2 veces seguidas en dev y un simple "primera vez" se
  // dispara igual en la segunda) para no pisar el ?tab= inicial de la URL
  // (usado por "Ver oportunidades"/"Ver estado de renovación" desde otros
  // modulos) — si cambia a otro cliente despues, ahi si vuelve a "resumen".
  const clienteAnteriorRef = useRef<string | null>(null);
  useEffect(() => {
    setHistorial(null);
    setErrorHistorial(null);
    setIncidenciasResp(null);
    setErrorIncidencias(null);
    if (clienteAnteriorRef.current !== null && clienteAnteriorRef.current !== numeroDocumentoCliente) {
      setTab("resumen");
    }
    clienteAnteriorRef.current = numeroDocumentoCliente;
    setEditingTelefono(false);
  }, [numeroDocumentoCliente]);

  async function handleSaveMetadata(event: FormEvent) {
    event.preventDefault();
    setSavingMetadata(true);
    try {
      await updateClienteMetadata(numeroDocumentoCliente, {
        segmentoManual: segmentoManual.trim() || null,
        estadoPostVentaManual: estadoManual || null,
        etiquetas: etiquetasText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        observacionGeneral: observacionGeneral.trim() || null,
      });
      refetch();
    } finally {
      setSavingMetadata(false);
    }
  }

  async function handleAddNota(nota: string, imagenes: File[]) {
    setSavingNota(true);
    try {
      const creada = await createNota({ numeroDocumentoCliente, nota });
      if (imagenes.length > 0) {
        await uploadAdjuntos("NOTA", creada.id, imagenes);
      }
      setNotaDrawerOpen(false);
      refetch();
    } finally {
      setSavingNota(false);
    }
  }

  async function handleAddTarea(values: TareaFormValues) {
    setSavingTarea(true);
    try {
      await createTarea({
        numeroDocumentoCliente,
        tipo: values.tipo,
        origen: tareaDesdeIncidencia ? "INCIDENCIA" : "FICHA_CLIENTE",
        origenEntidadTipo: tareaDesdeIncidencia ? "INCIDENCIA" : null,
        origenEntidadId: tareaDesdeIncidencia ? String(tareaDesdeIncidencia.idIncidencia) : null,
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        responsable: values.responsable,
        prioridad: values.prioridad,
        fechaVencimiento: values.fechaVencimiento || null,
      });
      setTareaDrawerOpen(false);
      setTareaDesdeIncidencia(null);
      refetch();
    } finally {
      setSavingTarea(false);
    }
  }

  function handleCrearTareaDesdeIncidencia(inc: Incidencia) {
    setTareaDesdeIncidencia(inc);
    setTareaInicial({
      titulo: `Seguimiento incidencia: ${inc.tipo || "Sin tipo"}`,
      descripcion: inc.caso || inc.descripcion || "",
      responsable: username ?? "",
      tipo: "SOPORTE",
    });
    setTareaDrawerOpen(true);
  }

  if (loading && !data) {
    return (
      <div>
        <Skeleton height={120} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <button type="button" className="btn btn-ghost ficha-volver" onClick={() => navigate(-1)}>
          ← Volver
        </button>
        <p className="error-text">{error ?? "Cliente no encontrado"}</p>
      </div>
    );
  }

  const { cliente, notas, tareas, alertas, oportunidades, seguimientoPostVenta } = data;
  const telefonoLimpio = cliente.telefonoEfectivo?.replace(/\D/g, "");
  // Defensivo: mismo caso que sistemas (ver SistemasBadges) — en produccion
  // se vio undefined para algun cliente pese al tipo no-nullable.
  const usuarios = cliente.usuarios ?? [];
  const ultimoPago = cliente.ordenVigente.pagos
    .filter((p) => p.fechaEmitido !== null)
    .reduce<(typeof cliente.ordenVigente.pagos)[number] | null>(
      (mas, actual) =>
        !mas || (actual.fechaEmitido as string) > (mas.fechaEmitido as string) ? actual : mas,
      null
    );

  async function handleCargarHistorial() {
    setLoadingHistorial(true);
    setErrorHistorial(null);
    try {
      const res = await getHistorialSeguimiento(cliente.ordenVigente.idOrdenServicio);
      setHistorial(res.data);
    } catch {
      setErrorHistorial("No se pudo cargar el historial de seguimiento.");
    } finally {
      setLoadingHistorial(false);
    }
  }

  async function handleCargarIncidencias() {
    setLoadingIncidencias(true);
    setErrorIncidencias(null);
    try {
      const res = await getIncidencias(cliente.numeroDocumentoCliente);
      setIncidenciasResp(res);
    } catch {
      setErrorIncidencias("No se pudo cargar las incidencias.");
    } finally {
      setLoadingIncidencias(false);
    }
  }

  const counts = { tareas: tareas.length, notas: notas.length };

  return (
    <div>
      <button type="button" className="btn btn-ghost ficha-volver" onClick={() => navigate(-1)}>
        ← Volver
      </button>
      <div className="card ficha-header">
        <div>
          <h1>{cliente.nombreCliente}</h1>
          <div className="ficha-header-meta">
            RUC/DNI {cliente.numeroDocumentoCliente}
            {" · "}
            {editingTelefono ? (
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input
                  type="text"
                  value={telefonoInput}
                  onChange={(e) => setTelefonoInput(e.target.value)}
                  placeholder="Número de teléfono"
                  style={{ width: 150 }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "2px 10px", fontSize: 13 }}
                  onClick={handleSaveTelefono}
                  disabled={savingTelefono}
                >
                  {savingTelefono ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "2px 10px", fontSize: 13 }}
                  onClick={() => {
                    setEditingTelefono(false);
                    setTelefonoInput(cliente.telefonoEfectivo ?? "");
                  }}
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <span>
                Tel. {cliente.telefonoEfectivo ?? "No registrado"}
                {cliente.telefonoManual ? " (corregido)" : ""}
                <button
                  type="button"
                  onClick={() => setEditingTelefono(true)}
                  style={{
                    marginLeft: 6,
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--color-primary-700, #2563eb)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    font: "inherit",
                  }}
                >
                  Editar
                </button>
              </span>
            )}
          </div>
          <div className="ficha-header-badges">
            <EstadoPostVentaPill
              estado={cliente.estadoPostVentaEfectivo}
              manual={!!cliente.estadoPostVentaManual}
            />
            <SegmentoPill segmento={cliente.segmentoEfectivo} manual={!!cliente.segmentoManual} />
            <Badge tone="neutral">{cliente.planActual.nombre}</Badge>
          </div>
        </div>
        <div className="ficha-quick-actions">
          <ActionMenu
            label={`Acciones para ${cliente.nombreCliente}`}
            items={[
              { key: "intereses", label: "Intereses y reuniones", onSelect: () => setInteresesDrawerOpen(true) },
              ...buildContactoMenuItems({
                numeroDocumentoCliente: cliente.numeroDocumentoCliente,
                idOrdenServicio: cliente.ordenVigente.idOrdenServicio,
                telefonoLimpio,
              }),
              ...(cliente.ordenVigente.linkSistema
                ? [{ key: "abrir-sistema", label: "Abrir sistema", href: cliente.ordenVigente.linkSistema, target: "_blank" }]
                : []),
              { key: "registrar-nota", label: "Registrar nota", onSelect: () => setNotaDrawerOpen(true) },
              {
                key: "crear-tarea",
                label: "Crear tarea",
                onSelect: () => {
                  setTareaDesdeIncidencia(null);
                  setTareaInicial({ responsable: username ?? "", tipo: "SEGUIMIENTO" });
                  setTareaDrawerOpen(true);
                },
              },
            ]}
          />
        </div>
      </div>

      <div className="clientes-toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={tab === t.value ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => setTab(t.value)}
            >
              {t.label(counts)}
            </button>
          ))}
        </div>
      </div>

      {tab === "resumen" && (
        <ResumenTab
          cliente={cliente}
          alertas={alertas}
          estadoManual={estadoManual}
          onEstadoManualChange={setEstadoManual}
          segmentoManual={segmentoManual}
          onSegmentoManualChange={setSegmentoManual}
          etiquetasText={etiquetasText}
          onEtiquetasTextChange={setEtiquetasText}
          observacionGeneral={observacionGeneral}
          onObservacionGeneralChange={setObservacionGeneral}
          savingMetadata={savingMetadata}
          onSaveMetadata={handleSaveMetadata}
        />
      )}

      {tab === "cobranza" && <CobranzaTab cliente={cliente} ultimoPago={ultimoPago} />}

      {tab === "servicios" && <ServiciosTab cliente={cliente} />}

      {tab === "incidencias" && (
        <IncidenciasTab
          numeroDocumentoCliente={cliente.numeroDocumentoCliente}
          incidenciasResp={incidenciasResp}
          loading={loadingIncidencias}
          error={errorIncidencias}
          filtro={filtroIncidencias}
          onFiltroChange={setFiltroIncidencias}
          onCargar={handleCargarIncidencias}
          onCrearTareaDesdeIncidencia={handleCrearTareaDesdeIncidencia}
        />
      )}

      {tab === "renovacion" && <RenovacionTab cliente={cliente} />}

      {tab === "tareas" && <TareasTab tareas={tareas} onChanged={refetch} />}

      {tab === "oportunidades" && <OportunidadesTab oportunidades={oportunidades} />}

      {tab === "notas" && (
        <NotasTab
          notas={notas}
          usuarios={usuarios}
          cantidadTrabajadores={cliente.cantidadTrabajadores}
          cantidadTrabajadoresActualizadoEn={cliente.cantidadTrabajadoresActualizadoEn}
          linkSistema={cliente.ordenVigente.linkSistema}
          refreshingTrabajadores={refreshingTrabajadores}
          onRefreshTrabajadores={handleRefreshTrabajadores}
          usuarioCopiado={usuarioCopiado}
          onCopiar={handleCopiar}
        />
      )}

      {tab === "historial" && (
        <HistorialTab
          cliente={cliente}
          numeroDocumentoCliente={cliente.numeroDocumentoCliente}
          historial={historial}
          loadingHistorial={loadingHistorial}
          errorHistorial={errorHistorial}
          onCargarHistorial={handleCargarHistorial}
          capacitaciones={capacitaciones}
          loadingCapacitaciones={loadingCapacitaciones}
          seguimientoPostVenta={seguimientoPostVenta}
          onOpenSeguimientoPvDrawer={() => setSeguimientoPvDrawerOpen(true)}
        />
      )}

      <Drawer open={notaDrawerOpen} onClose={() => setNotaDrawerOpen(false)} title="Registrar nota">
        <NotaForm onSubmit={handleAddNota} onCancel={() => setNotaDrawerOpen(false)} submitting={savingNota} />
      </Drawer>

      <Drawer
        open={tareaDrawerOpen}
        onClose={() => {
          setTareaDrawerOpen(false);
          setTareaDesdeIncidencia(null);
        }}
        title={tareaDesdeIncidencia ? `Tarea — incidencia #${tareaDesdeIncidencia.idIncidencia}` : "Crear tarea"}
      >
        <TareaForm
          key={tareaDrawerOpen ? JSON.stringify(tareaInicial) : "closed"}
          initial={tareaInicial}
          onSubmit={handleAddTarea}
          onCancel={() => {
            setTareaDrawerOpen(false);
            setTareaDesdeIncidencia(null);
          }}
          submitting={savingTarea}
        />
      </Drawer>

      <Drawer
        open={interesesDrawerOpen}
        onClose={() => setInteresesDrawerOpen(false)}
        title="Intereses y reuniones"
      >
        <InteresesReunionesPanel
          numeroDocumentoCliente={cliente.numeroDocumentoCliente}
          idOrdenServicio={cliente.ordenVigente.idOrdenServicio}
          ejecutivoDefault={cliente.ordenVigente.ejecutivo}
          telefono={cliente.telefonoEfectivo}
          telefonoManual={cliente.telefonoManual}
          catalogo={data.intereses.catalogo}
          marcados={data.intereses.marcados}
          reuniones={data.reuniones}
          onChanged={refetch}
        />
      </Drawer>

      {seguimientoPvDrawerOpen && (
        <SeguimientoPostVentaDrawer
          numeroDocumentoCliente={cliente.numeroDocumentoCliente}
          onClose={() => {
            setSeguimientoPvDrawerOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
