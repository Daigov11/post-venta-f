import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { NotaForm } from "../components/forms/NotaForm";
import { SeguimientoForm } from "../components/forms/SeguimientoForm";
import { TareaForm, type TareaFormValues } from "../components/forms/TareaForm";
import { InteresesReunionesPanel } from "../components/panels/InteresesReunionesPanel";
import { SeguimientoPostVentaDrawer } from "../components/panels/SeguimientoPostVentaDrawer";
import { Badge } from "../components/ui/Badge";
import { Drawer } from "../components/ui/Drawer";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { EstadoPostVentaPill, NivelAlertaPill, SegmentoPill } from "../components/ui/StatusPill";
import { useAuth } from "../context/AuthContext";
import { useCliente } from "../hooks/useCliente";
import { useSeguimientos } from "../hooks/useSeguimientos";
import { refreshSystemUsersOne, updateClienteMetadata } from "../services/clientes";
import { getHistorialSeguimiento } from "../services/historial";
import { getIncidencias } from "../services/incidencias";
import { createNota } from "../services/notas";
import { createSeguimiento, createTarea, updateTarea } from "../services/tareas";
import type {
  EstadoPostVenta,
  EstadoTarea,
  HistorialSeguimientoEvento,
  Incidencia,
  Tarea,
} from "../types/postventaCliente";
import { formatCurrency, formatNumber, formatValorEstimado } from "../utils/format";
import "./ClienteFicha.css";

const ESTADO_TAREA_LABEL: Record<EstadoTarea, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  ESPERANDO_CLIENTE: "Esperando cliente",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

// El historial de seguimiento trae ~30 nestado distintos, propios del motor
// de estados interno de APIWorking — no tenemos un catalogo confiable de que
// significa cada uno. Solo se colorean los 2 que ya usamos en otro lado de la
// app con ese mismo significado (esProblema en Renovaciones usa literalmente
// "SUSPENDIDO POR PAGO"); el resto queda neutral en vez de inventar semántica.
function HistorialEstadoBadge({ estado }: { estado: string }) {
  if (estado === "SUSPENDIDO POR PAGO") return <Badge tone="critical">{estado}</Badge>;
  if (estado === "COBRANZA") return <Badge tone="success">{estado}</Badge>;
  return <Badge tone="neutral">{estado || "Sin estado"}</Badge>;
}

function IncidenciaEstadoBadge({ resuelta }: { resuelta: boolean }) {
  return resuelta ? (
    <Badge tone="success">Resuelta</Badge>
  ) : (
    <Badge tone="warning">Abierta</Badge>
  );
}

type FichaTab = "resumen" | "actividad" | "historial" | "notas";

function TareaItem({ tarea, onChanged }: { tarea: Tarea; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: seguimientos, loading, refetch } = useSeguimientos(tarea.id, expanded);
  const [addingSeguimiento, setAddingSeguimiento] = useState(false);
  const [updatingEstado, setUpdatingEstado] = useState(false);

  async function handleAddSeguimiento(comentario: string) {
    setAddingSeguimiento(true);
    try {
      await createSeguimiento(tarea.id, comentario);
      refetch();
    } finally {
      setAddingSeguimiento(false);
    }
  }

  async function handleEstadoChange(estado: EstadoTarea) {
    setUpdatingEstado(true);
    try {
      await updateTarea(tarea.id, { estado });
      onChanged();
    } finally {
      setUpdatingEstado(false);
    }
  }

  return (
    <div className="tarea-item">
      <div className="tarea-item-header">
        <div>
          <div className="tarea-item-title">{tarea.titulo}</div>
          <div className="tarea-item-meta">
            {tarea.responsable} · Prioridad {tarea.prioridad}
            {tarea.fechaVencimiento ? ` · Vence ${tarea.fechaVencimiento}` : ""}
          </div>
        </div>
        <select
          value={tarea.estado}
          disabled={updatingEstado}
          onChange={(event) => handleEstadoChange(event.target.value as EstadoTarea)}
        >
          {Object.entries(ESTADO_TAREA_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {tarea.descripcion && <p className="muted">{tarea.descripcion}</p>}
      <button type="button" className="btn btn-ghost" onClick={() => setExpanded((v) => !v)}>
        {expanded ? "Ocultar seguimientos" : "Ver seguimientos"}
      </button>
      {expanded && (
        <>
          {loading && <Skeleton height={40} />}
          <div className="seguimientos-list">
            {seguimientos && seguimientos.length === 0 && (
              <span className="muted">Sin seguimientos todavía.</span>
            )}
            {seguimientos?.map((s) => (
              <div key={s.id} className="seguimiento-item">
                <div>{s.comentario}</div>
                <div className="seguimiento-item-meta">
                  {s.usuario} · {new Date(s.createdAt).toLocaleString("es-PE")}
                </div>
              </div>
            ))}
          </div>
          <SeguimientoForm onSubmit={handleAddSeguimiento} submitting={addingSeguimiento} />
        </>
      )}
    </div>
  );
}

export function ClienteFichaPage() {
  const { numeroDocumentoCliente = "" } = useParams();
  const { username } = useAuth();
  const { data, loading, error, refetch } = useCliente(numeroDocumentoCliente);
  const [tab, setTab] = useState<FichaTab>("resumen");
  const [notaDrawerOpen, setNotaDrawerOpen] = useState(false);
  const [tareaDrawerOpen, setTareaDrawerOpen] = useState(false);
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
  useEffect(() => {
    setHistorial(null);
    setErrorHistorial(null);
    setIncidenciasResp(null);
    setErrorIncidencias(null);
    setTab("resumen");
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

  async function handleAddNota(nota: string) {
    setSavingNota(true);
    try {
      await createNota({ numeroDocumentoCliente, nota });
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
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        responsable: values.responsable,
        prioridad: values.prioridad,
        fechaVencimiento: values.fechaVencimiento || null,
      });
      setTareaDrawerOpen(false);
      refetch();
    } finally {
      setSavingTarea(false);
    }
  }

  if (loading && !data) {
    return (
      <div>
        <Skeleton height={120} />
      </div>
    );
  }

  if (error || !data) {
    return <p className="error-text">{error ?? "Cliente no encontrado"}</p>;
  }

  const { cliente, notas, tareas, alertas, oportunidades, seguimientoPostVenta } = data;
  const telefonoLimpio = cliente.telefonoEfectivo?.replace(/\D/g, "");
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

  return (
    <div>
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
          {telefonoLimpio && (
            <a className="btn btn-secondary" href={`tel:${telefonoLimpio}`}>
              Llamar
            </a>
          )}
          {telefonoLimpio && (
            <a
              className="btn btn-secondary"
              href={`https://wa.me/51${telefonoLimpio}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          )}
          {cliente.ordenVigente.linkSistema && (
            <a
              className="btn btn-secondary"
              href={cliente.ordenVigente.linkSistema}
              target="_blank"
              rel="noreferrer"
            >
              Abrir sistema
            </a>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => setNotaDrawerOpen(true)}>
            Registrar nota
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setTareaDrawerOpen(true)}>
            Crear tarea
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setInteresesDrawerOpen(true)}
          >
            Intereses y reuniones
          </button>
        </div>
      </div>

      <div className="clientes-toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className={tab === "resumen" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTab("resumen")}
          >
            Resumen
          </button>
          <button
            type="button"
            className={tab === "actividad" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTab("actividad")}
          >
            Actividad y seguimiento
          </button>
          <button
            type="button"
            className={tab === "historial" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTab("historial")}
          >
            Historial
          </button>
          <button
            type="button"
            className={tab === "notas" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTab("notas")}
          >
            Notas y tareas ({tareas.length + notas.length})
          </button>
        </div>
      </div>

      {tab === "resumen" && (
      <div className="ficha-grid">
        <section className="card ficha-section">
          <h2>Resumen</h2>
          <div className="ficha-field-list">
            <div className="ficha-field-row">
              <span className="ficha-field-label">OS vigente</span>
              <span className="ficha-field-value">{cliente.ordenVigente.numeroOs}</span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Fecha OS</span>
              <span className="ficha-field-value">
                {cliente.ordenVigente.fechaOs
                  ? new Date(cliente.ordenVigente.fechaOs).toLocaleDateString("es-PE")
                  : "No determinado"}
              </span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Ubicación</span>
              <span className="ficha-field-value">
                {cliente.ubicacion && "departamento" in cliente.ubicacion
                  ? `${cliente.ubicacion.distrito}, ${cliente.ubicacion.provincia}, ${cliente.ubicacion.departamento}`
                  : cliente.ubicacion?.raw ?? "No determinado"}
              </span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Rubro</span>
              <span className="ficha-field-value">{cliente.rubro}</span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Ejecutivo</span>
              <span className="ficha-field-value">{cliente.ordenVigente.ejecutivo ?? "—"}</span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Vendedor/Distribuidor</span>
              <span className="ficha-field-value">
                {cliente.ordenVigente.distribuidor?.nombre ?? "—"}
              </span>
            </div>
          </div>
        </section>

        <section className="card ficha-section">
          <h2>Plan</h2>
          <div className="ficha-field-list">
            <div className="ficha-field-row">
              <span className="ficha-field-label">Plan</span>
              <span className="ficha-field-value">{cliente.planActual.nombre}</span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Periodicidad</span>
              <span className="ficha-field-value">{cliente.planActual.periodicidad}</span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Pago proyectado anual</span>
              <span className="ficha-field-value">
                {formatValorEstimado(cliente.planActual.precioAnualProyectado)}
              </span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Tipo OS</span>
              <span className="ficha-field-value">{cliente.ordenVigente.tipoOS || "—"}</span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Próxima renovación</span>
              <span className="ficha-field-value">
                {cliente.proximaRenovacion ? (
                  <>
                    {new Date(cliente.proximaRenovacion).toLocaleDateString("es-PE")}
                    {cliente.diasParaRenovacion !== null && (
                      <>
                        {" "}
                        ·{" "}
                        {cliente.diasParaRenovacion < 0 ? (
                          <Badge tone="critical">Vencida</Badge>
                        ) : (
                          <Badge tone={cliente.diasParaRenovacion <= 7 ? "warning" : "neutral"}>
                            Faltan {cliente.diasParaRenovacion} día(s)
                          </Badge>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  "No determinado"
                )}
              </span>
            </div>
          </div>
        </section>

        <section className="card ficha-section">
          <h2>Sistema</h2>
          <div className="ficha-field-list">
            <div className="ficha-field-row">
              <span className="ficha-field-label">Link sistema</span>
              <span className="ficha-field-value">
                {cliente.ordenVigente.linkSistema ? (
                  <a href={cliente.ordenVigente.linkSistema} target="_blank" rel="noreferrer">
                    Abrir
                  </a>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Fecha inicio</span>
              <span className="ficha-field-value">
                {cliente.fechaInicioCliente
                  ? new Date(cliente.fechaInicioCliente).toLocaleDateString("es-PE")
                  : "No determinado"}
              </span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Antigüedad</span>
              <span className="ficha-field-value">{cliente.antiguedad.texto}</span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Comprobantes históricos</span>
              <span className="ficha-field-value">
                {formatNumber(cliente.cantidadComprobantesHistorico)}
              </span>
            </div>
          </div>
        </section>

        <section className="card ficha-section">
          <h2>Facturación y SUNAT</h2>
          {cliente.ordenVigente.postVentaExtra ? (
            <div className="ficha-field-list">
              <div className="ficha-field-row">
                <span className="ficha-field-label">Nombre comercial</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.nombreComercial ?? "—"}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Ingresos mensuales</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.ingresosClienteMensual === null
                    ? "No determinado"
                    : formatCurrency(cliente.ordenVigente.postVentaExtra.ingresosClienteMensual)}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Comprobantes mensuales</span>
                <span className="ficha-field-value">
                  {formatNumber(cliente.ordenVigente.postVentaExtra.cantidadComprobantesMensual)}
                  {" "}
                  (BV {cliente.ordenVigente.postVentaExtra.comprobantesMensualDesglose.bv} · FV{" "}
                  {cliente.ordenVigente.postVentaExtra.comprobantesMensualDesglose.fv} · NV{" "}
                  {cliente.ordenVigente.postVentaExtra.comprobantesMensualDesglose.nv} · Otros{" "}
                  {cliente.ordenVigente.postVentaExtra.comprobantesMensualDesglose.otros})
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Ciclo de facturación</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.nCicloFacturacion ?? "—"}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Suspendido</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.suspendido ? (
                    <Badge tone="critical">Sí</Badge>
                  ) : (
                    <Badge tone="success">No</Badge>
                  )}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Estado sistema</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.nEstadoSistema ?? "—"}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Estado SUNAT</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.nEstadoSunat ?? "—"}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Afiliado SUNAT</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.nAfiliadoSunat ?? "—"}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Capacitado</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.nEstadoCapacitado ?? "—"}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Fecha de activación</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.fechaActivacion
                    ? new Date(cliente.ordenVigente.postVentaExtra.fechaActivacion).toLocaleDateString(
                        "es-PE"
                      )
                    : "No determinado"}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Vencimiento certificado</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.fechaVencimientoCertificado
                    ? new Date(
                        cliente.ordenVigente.postVentaExtra.fechaVencimientoCertificado
                      ).toLocaleDateString("es-PE")
                    : "No determinado"}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Fecha de instalación</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.fechaInstalacion
                    ? new Date(cliente.ordenVigente.postVentaExtra.fechaInstalacion).toLocaleDateString(
                        "es-PE"
                      )
                    : "No determinado"}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Instalado</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.instalado ? (
                    <Badge tone="success">Sí</Badge>
                  ) : (
                    <Badge tone="neutral">No</Badge>
                  )}
                </span>
              </div>
              <div className="ficha-field-row">
                <span className="ficha-field-label">Duración del ciclo (meses)</span>
                <span className="ficha-field-value">
                  {cliente.ordenVigente.postVentaExtra.meses ?? "No determinado"}
                </span>
              </div>
            </div>
          ) : (
            <EmptyState message="Esta orden de servicio es anterior al rango disponible del endpoint de facturación (25-09-2022) o todavía no aparece en el último sync." />
          )}
        </section>

        <section className="card ficha-section">
          <h2>Equipo</h2>
          <div className="ficha-field-list">
            <div className="ficha-field-row">
              <span className="ficha-field-label">Tiene equipo</span>
              <span className="ficha-field-value">
                {cliente.ordenVigente.existeEquipo ? (
                  <Badge tone="success">Sí</Badge>
                ) : (
                  <Badge tone="neutral">No</Badge>
                )}
              </span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">ID equipo</span>
              <span className="ficha-field-value">{cliente.ordenVigente.idEquipo ?? "—"}</span>
            </div>
          </div>
        </section>
      </div>
      )}

      {tab === "actividad" && (
      <div className="ficha-grid">
        <section className="card ficha-section">
          <h2>Trabajadores</h2>
          <p className="muted">Aproximado por los usuarios registrados en el sistema del cliente.</p>
          <div className="ficha-field-list">
            <div className="ficha-field-row">
              <span className="ficha-field-label">N° de trabajadores</span>
              <span className="ficha-field-value">
                {cliente.cantidadTrabajadores === null
                  ? "Sin datos"
                  : formatNumber(cliente.cantidadTrabajadores)}
              </span>
            </div>
            {cliente.cantidadTrabajadoresActualizadoEn && (
              <div className="ficha-field-row">
                <span className="ficha-field-label">Actualizado</span>
                <span className="ficha-field-value">
                  {new Date(cliente.cantidadTrabajadoresActualizadoEn).toLocaleString("es-PE")}
                </span>
              </div>
            )}
          </div>

          {cliente.usuarios.length > 0 && (
            <div className="usuarios-list">
              {cliente.usuarios.map((usuario) => (
                <div key={usuario} className="usuarios-list-item">
                  <code>{usuario}</code>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleCopiar(usuario, usuario)}
                  >
                    {usuarioCopiado === usuario ? "Copiado ✓" : "Copiar"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRefreshTrabajadores}
              disabled={refreshingTrabajadores || !cliente.ordenVigente.linkSistema}
            >
              {refreshingTrabajadores ? "Actualizando..." : "Actualizar"}
            </button>
            {cliente.usuarios.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleCopiar(cliente.usuarios.join("\n"), "__todos__")}
              >
                {usuarioCopiado === "__todos__" ? "Copiado ✓" : "Copiar todos"}
              </button>
            )}
          </div>
        </section>

        <section className="card ficha-section">
          <h2>Actividad del sistema</h2>
          <p className="muted">Último ingreso registrado por el cliente en su sistema.</p>
          <div className="ficha-field-list">
            <div className="ficha-field-row">
              <span className="ficha-field-label">Último ingreso</span>
              <span className="ficha-field-value">
                {cliente.ordenVigente.postVentaExtra?.fechaInactivo
                  ? new Date(cliente.ordenVigente.postVentaExtra.fechaInactivo).toLocaleString(
                      "es-PE"
                    )
                  : "Sin datos"}
              </span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Hace</span>
              <span className="ficha-field-value">
                {cliente.diasSinActividad === null ? (
                  "Sin datos"
                ) : cliente.diasSinActividad <= 7 ? (
                  <Badge tone="success">{cliente.diasSinActividad} día(s)</Badge>
                ) : cliente.diasSinActividad <= 30 ? (
                  <Badge tone="neutral">{cliente.diasSinActividad} día(s)</Badge>
                ) : (
                  <Badge tone="warning">{cliente.diasSinActividad} día(s)</Badge>
                )}
              </span>
            </div>
          </div>
        </section>

        {seguimientoPostVenta && (
          <section className="card ficha-section">
            <h2>Seguimiento Post Venta</h2>
            <p className="muted">
              Onboarding de cliente recién capacitado ({seguimientoPostVenta.origen === "AUTOMATICO" ? "flujo automático" : "importado del Excel de Ligia"}).
            </p>
            <div className="ficha-field-list">
              <div className="ficha-field-row">
                <span className="ficha-field-label">Estado</span>
                <span className="ficha-field-value">
                  <Badge
                    tone={
                      seguimientoPostVenta.estadoPipeline === "EXITOSO"
                        ? "success"
                        : seguimientoPostVenta.estadoPipeline === "REQUIERE_ATENCION"
                          ? "critical"
                          : "neutral"
                    }
                  >
                    {seguimientoPostVenta.estadoPipeline === "EXITOSO"
                      ? "Cliente exitoso"
                      : seguimientoPostVenta.estadoPipeline === "REQUIERE_ATENCION"
                        ? "Requiere atención"
                        : "En proceso"}
                  </Badge>
                </span>
              </div>
              {seguimientoPostVenta.etapaActual && (
                <div className="ficha-field-row">
                  <span className="ficha-field-label">Etapa actual</span>
                  <span className="ficha-field-value">
                    {seguimientoPostVenta.etapaActual.label}
                    {seguimientoPostVenta.etapaActual.vencida && (
                      <>
                        {" "}
                        <Badge tone="warning">Toca contactar</Badge>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
            <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSeguimientoPvDrawerOpen(true)}
              >
                Ver / registrar seguimiento
              </button>
            </div>
          </section>
        )}
      </div>
      )}

      {tab === "resumen" && (
      <div className="ficha-grid">
        <section className="card ficha-section">
          <h2>Financiero</h2>
          <div className="ficha-field-list">
            <div className="ficha-field-row">
              <span className="ficha-field-label">Deuda OS vigente</span>
              <span className="ficha-field-value">{formatCurrency(cliente.ordenVigente.deuda)}</span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Deuda total (todas las OS)</span>
              <span className="ficha-field-value">{formatCurrency(cliente.deudaTotal)}</span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Deuda proyectada</span>
              <span className="ficha-field-value">
                {formatCurrency(cliente.ordenVigente.deudaProyectada)}
              </span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Facturas disponibles</span>
              <span className="ficha-field-value">{cliente.ordenVigente.facturas.disponibles}</span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Facturas de equipo disponibles</span>
              <span className="ficha-field-value">
                {cliente.ordenVigente.facturas.equipoDisponibles}
              </span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">Último vencimiento de pago</span>
              <span className="ficha-field-value">
                {cliente.ultimoVencimientoPago
                  ? new Date(cliente.ultimoVencimientoPago).toLocaleDateString("es-PE")
                  : "Sin vencimientos todavía"}
              </span>
            </div>
            {ultimoPago && (
              <div className="ficha-field-row">
                <span className="ficha-field-label">Última factura ({ultimoPago.nroComprobante})</span>
                <span className="ficha-field-value">
                  {ultimoPago.fechaEmitido
                    ? new Date(ultimoPago.fechaEmitido).toLocaleDateString("es-PE")
                    : "s/f"}{" "}
                  ·{" "}
                  {ultimoPago.deuda > 0 ? (
                    <Badge tone="critical">Debe {formatCurrency(ultimoPago.deuda)}</Badge>
                  ) : (
                    <Badge tone="success">Pagada</Badge>
                  )}
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="card ficha-section">
          <h2>Documentación</h2>
          <div className="ficha-progress-track">
            <div
              className="ficha-progress-fill"
              style={{ width: `${cliente.documentacionGlobal.porcentaje}%` }}
            />
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            {cliente.documentacionGlobal.disponibles}/{cliente.documentacionGlobal.total} documentos
            ({cliente.documentacionGlobal.porcentaje}%)
          </p>
        </section>

        <section className="card ficha-section">
          <h2>Gestión Post Venta</h2>
          <form className="stack-form" onSubmit={handleSaveMetadata}>
            <div className="field">
              <label htmlFor="estado-manual">Estado (override manual)</label>
              <select
                id="estado-manual"
                value={estadoManual}
                onChange={(event) => setEstadoManual(event.target.value as EstadoPostVenta | "")}
              >
                <option value="">Automático ({cliente.estadoPostVenta})</option>
                <option value="NORMAL">Normal</option>
                <option value="REVISAR">Revisar</option>
                <option value="ATENCION">Atención</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="segmento-manual">
                Segmento (override manual)
                {cliente.segmentoCalculado && (
                  <span className="muted"> — calculado: {cliente.segmentoCalculado}</span>
                )}
              </label>
              <select
                id="segmento-manual"
                value={segmentoManual}
                onChange={(event) => setSegmentoManual(event.target.value)}
              >
                <option value="">
                  Automático {cliente.segmentoCalculado ? `(${cliente.segmentoCalculado})` : "(sin evaluar)"}
                </option>
                <option value="DIAMANTE">Diamante</option>
                <option value="ORO">Oro</option>
                <option value="PLATA">Plata</option>
                <option value="CRITICO">Crítico</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="etiquetas">Etiquetas (separadas por coma)</label>
              <input
                id="etiquetas"
                value={etiquetasText}
                onChange={(event) => setEtiquetasText(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="observacion-general">Observación general</label>
              <textarea
                id="observacion-general"
                rows={3}
                value={observacionGeneral}
                onChange={(event) => setObservacionGeneral(event.target.value)}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={savingMetadata}>
                {savingMetadata ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </section>
      </div>
      )}

      {tab === "historial" && (
      <div className="ficha-grid">
        <section className="card ficha-section">
          <h2>Datos aún no disponibles</h2>
          <EmptyState message="Último login, renovaciones, módulos y encuestas quedarán disponibles cuando APIWorking entregue los endpoints correspondientes. Historial de estados, contacto efectivo (llamadas) e incidencias ya se ven en 'Incidencias' e 'Historial de seguimiento' más abajo." />
        </section>

        <section className="card ficha-section ficha-full-width">
          <h2>Historial de órdenes de servicio ({cliente.cantidadOs})</h2>
          <div className="ficha-field-list">
            {cliente.osRefs.map((os) => (
              <div key={os.idOrdenServicio} className="ficha-field-row">
                <span className="ficha-field-label">
                  {os.numeroOs} — {os.nombrePlan}
                </span>
                <span className="ficha-field-value">
                  {os.fechaOs ? new Date(os.fechaOs).toLocaleDateString("es-PE") : "s/f"} ·{" "}
                  {os.nEstadoApiWorking} · {formatCurrency(os.deuda)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card ficha-section ficha-full-width">
          <h2>Incidencias{incidenciasResp ? ` (${incidenciasResp.total})` : ""}</h2>
          <p className="muted">
            Incidencias reportadas para este cliente en APIWorking, con su estado real de
            resolución.
          </p>
          {incidenciasResp === null && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCargarIncidencias}
              disabled={loadingIncidencias}
            >
              {loadingIncidencias ? "Cargando..." : "Ver incidencias"}
            </button>
          )}
          {errorIncidencias && <p className="error-text">{errorIncidencias}</p>}
          {incidenciasResp !== null && incidenciasResp.total > 0 && (
            <p className="muted">
              {incidenciasResp.abiertas} abierta(s) · {incidenciasResp.resueltas} resuelta(s)
            </p>
          )}
          {incidenciasResp !== null && incidenciasResp.total === 0 && (
            <EmptyState title="Sin incidencias registradas" />
          )}
          {incidenciasResp !== null && incidenciasResp.data.length > 0 && (
            <div className="ficha-field-list">
              {incidenciasResp.data.map((inc) => (
                <div key={inc.idIncidencia} className="historial-seguimiento-item">
                  <div className="historial-seguimiento-item-header">
                    <IncidenciaEstadoBadge resuelta={inc.resuelta} />
                    <Badge tone="neutral">{inc.tipo || "Sin tipo"}</Badge>
                    <span className="historial-seguimiento-item-fecha">
                      {inc.fecha ? new Date(inc.fecha).toLocaleString("es-PE") : "Sin fecha"}
                    </span>
                  </div>
                  {inc.caso && <div className="historial-seguimiento-item-obs">{inc.caso}</div>}
                  {inc.descripcion && inc.descripcion !== inc.caso && (
                    <div className="historial-seguimiento-item-obs">{inc.descripcion}</div>
                  )}
                  <div className="historial-seguimiento-item-persona">
                    Asignado a {inc.asignadoA || "—"}
                    {inc.aCargo && inc.aCargo !== "SIN ASIGNAR" && ` · A cargo de ${inc.aCargo}`}
                    {inc.reportadoPorCliente && " · Reportada por el cliente"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card ficha-section ficha-full-width">
          <h2>Historial de seguimiento{historial ? ` (${historial.length})` : ""}</h2>
          <p className="muted">
            Bitácora real de APIWorking para la OS vigente ({cliente.ordenVigente.numeroOs}) —
            cambios de estado, llamadas al cliente e incidencias registradas por el equipo.
          </p>
          {historial === null && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCargarHistorial}
              disabled={loadingHistorial}
            >
              {loadingHistorial ? "Cargando..." : "Ver historial completo"}
            </button>
          )}
          {errorHistorial && <p className="error-text">{errorHistorial}</p>}
          {historial !== null && historial.length === 0 && (
            <EmptyState title="Sin historial registrado" />
          )}
          {historial !== null && historial.length > 0 && (
            <div className="ficha-field-list">
              {historial.map((ev, i) => (
                <div key={`${ev.fecha ?? "sf"}-${i}`} className="historial-seguimiento-item">
                  <div className="historial-seguimiento-item-header">
                    <HistorialEstadoBadge estado={ev.estado} />
                    <span className="historial-seguimiento-item-fecha">
                      {ev.fecha ? new Date(ev.fecha).toLocaleString("es-PE") : "Sin fecha"}
                    </span>
                  </div>
                  {ev.observacion && (
                    <div className="historial-seguimiento-item-obs">{ev.observacion}</div>
                  )}
                  <div className="historial-seguimiento-item-persona">{ev.persona || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      )}

      {tab === "resumen" && (
      <div className="ficha-grid">
        <section className="card ficha-section ficha-full-width">
          <h2>Alertas</h2>
          {alertas.length === 0 ? (
            <EmptyState title="Sin alertas activas" />
          ) : (
            alertas.map((a) => (
              <div key={a.id} className="alerta-item">
                <NivelAlertaPill nivel={a.nivel} /> <strong>{a.titulo}</strong> — {a.mensaje}
              </div>
            ))
          )}
        </section>

        <section className="card ficha-section ficha-full-width">
          <h2>Oportunidades</h2>
          {oportunidades.length === 0 ? (
            <EmptyState title="Sin oportunidades detectadas" />
          ) : (
            oportunidades.map((o) => (
              <div key={o.id} className="oportunidad-item">
                <strong>{o.titulo}</strong> — {o.mensaje} ({formatValorEstimado(o.valorEstimado)})
              </div>
            ))
          )}
        </section>
      </div>
      )}

      {tab === "notas" && (
      <div className="ficha-grid">
        <section className="card ficha-section ficha-full-width">
          <h2>Tareas ({tareas.length})</h2>
          {tareas.length === 0 ? (
            <EmptyState title="Sin tareas registradas" />
          ) : (
            <div className="seguimientos-list">
              {tareas.map((t) => (
                <TareaItem key={t.id} tarea={t} onChanged={refetch} />
              ))}
            </div>
          )}
        </section>

        <section className="card ficha-section ficha-full-width">
          <h2>Notas ({notas.length})</h2>
          {notas.length === 0 ? (
            <EmptyState title="Sin notas registradas" />
          ) : (
            <div className="ficha-field-list">
              {notas.map((n) => (
                <div key={n.id} className="seguimiento-item">
                  <div>{n.nota}</div>
                  <div className="seguimiento-item-meta">
                    {n.usuario} · {new Date(n.createdAt).toLocaleString("es-PE")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      )}

      <Drawer open={notaDrawerOpen} onClose={() => setNotaDrawerOpen(false)} title="Registrar nota">
        <NotaForm
          onSubmit={handleAddNota}
          onCancel={() => setNotaDrawerOpen(false)}
          submitting={savingNota}
        />
      </Drawer>

      <Drawer open={tareaDrawerOpen} onClose={() => setTareaDrawerOpen(false)} title="Crear tarea">
        <TareaForm
          initial={{ responsable: username ?? "" }}
          onSubmit={handleAddTarea}
          onCancel={() => setTareaDrawerOpen(false)}
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
