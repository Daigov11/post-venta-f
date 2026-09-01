import axios from "axios";
import { useEffect, useState, type FormEvent } from "react";
import { AdjuntosGaleria } from "../ui/AdjuntosGaleria";
import { Badge } from "../ui/Badge";
import { CalendarioFecha } from "../ui/CalendarioFecha";
import { EmptyState } from "../ui/EmptyState";
import { ImagenesPicker } from "../ui/ImagenesPicker";
import { uploadAdjuntos } from "../../services/adjuntos";
import { updateClienteMetadata } from "../../services/clientes";
import { getIncidencias } from "../../services/incidencias";
import {
  createIncidenciaManual,
  getIncidenciasManuales,
} from "../../services/incidenciasManuales";
import { createInteres, setClienteIntereses } from "../../services/intereses";
import { createNota, getNotas } from "../../services/notas";
import { createReunion, getDisponibilidad, updateReunionEstado } from "../../services/reuniones";
import type {
  EstadoReunion,
  Incidencia,
  IncidenciaManual,
  InteresCatalogo,
  ModalidadReunion,
  Nota,
  Reunion,
} from "../../types/postventaCliente";

const ESTADO_REUNION_LABEL: Record<EstadoReunion, string> = {
  PROGRAMADA: "Programada",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
  EN_ESPERA: "En espera de horario",
};

const TIPOS_REUNION_ESPECIAL = ["CAPACITACION", "REFORZAMIENTO"];

function esDomingo(fecha: string): boolean {
  if (!fecha) return false;
  return new Date(`${fecha}T00:00:00Z`).getUTCDay() === 0;
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InteresesReunionesPanel({
  numeroDocumentoCliente,
  idOrdenServicio,
  ejecutivoDefault,
  telefono,
  telefonoManual,
  catalogo,
  marcados,
  reuniones,
  onChanged,
}: {
  numeroDocumentoCliente: string;
  idOrdenServicio: number;
  ejecutivoDefault: string | null;
  telefono?: string | null;
  telefonoManual?: string | null;
  catalogo: InteresCatalogo[];
  marcados: number[];
  reuniones: Reunion[];
  onChanged: () => void;
}) {
  const [editingTelefono, setEditingTelefono] = useState(false);
  const [telefonoInput, setTelefonoInput] = useState(telefono ?? "");
  const [savingTelefono, setSavingTelefono] = useState(false);

  useEffect(() => {
    setTelefonoInput(telefono ?? "");
    setEditingTelefono(false);
  }, [numeroDocumentoCliente, telefono]);

  async function handleGuardarTelefono() {
    setSavingTelefono(true);
    try {
      await updateClienteMetadata(numeroDocumentoCliente, {
        telefonoManual: telefonoInput.trim() || null,
      });
      setEditingTelefono(false);
      onChanged();
    } finally {
      setSavingTelefono(false);
    }
  }

  const [incidencias, setIncidencias] = useState<Incidencia[] | null>(null);
  const [loadingIncidencias, setLoadingIncidencias] = useState(false);
  const [errorIncidencias, setErrorIncidencias] = useState<string | null>(null);
  const [filtroIncidencias, setFiltroIncidencias] = useState<"todas" | "abiertas" | "resueltas">(
    "todas"
  );
  const incidenciasFiltradas = (incidencias ?? []).filter((inc) => {
    if (filtroIncidencias === "abiertas") return !inc.resuelta;
    if (filtroIncidencias === "resueltas") return inc.resuelta;
    return true;
  });

  async function handleVerIncidencias() {
    setLoadingIncidencias(true);
    setErrorIncidencias(null);
    try {
      const res = await getIncidencias(numeroDocumentoCliente);
      setIncidencias(res.data);
    } catch {
      setErrorIncidencias("No se pudieron cargar las incidencias.");
    } finally {
      setLoadingIncidencias(false);
    }
  }

  // Nota de llamada — nota libre para dejar despues de comunicarse con el
  // cliente (llamada, WhatsApp, etc.). Reusa el mismo sistema de Notas que ya
  // existe (visible tambien en la pestaña "Notas" de la ficha), solo que
  // aca se puede cargar sin salir de este panel, justo despues de llamar.
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [nuevaNota, setNuevaNota] = useState("");
  const [nuevaNotaImagenes, setNuevaNotaImagenes] = useState<File[]>([]);
  const [savingNota, setSavingNota] = useState(false);

  useEffect(() => {
    setLoadingNotas(true);
    getNotas(numeroDocumentoCliente)
      .then(setNotas)
      .finally(() => setLoadingNotas(false));
  }, [numeroDocumentoCliente]);

  async function handleGuardarNota(event: FormEvent) {
    event.preventDefault();
    if (!nuevaNota.trim()) return;
    setSavingNota(true);
    try {
      const creada = await createNota({
        numeroDocumentoCliente,
        idOrdenServicio,
        nota: nuevaNota.trim(),
      });
      if (nuevaNotaImagenes.length > 0) {
        await uploadAdjuntos("NOTA", creada.id, nuevaNotaImagenes);
      }
      setNotas((prev) => [creada, ...prev]);
      setNuevaNota("");
      setNuevaNotaImagenes([]);
    } finally {
      setSavingNota(false);
    }
  }

  // Incidencias registradas a mano desde la app — separadas de las de arriba
  // (esas vienen de APIWorking) porque todavia no se conecta el endpoint de
  // creacion real (existe, se conecta mas adelante). Se cargan solas al
  // abrir el panel, es una consulta local rapida, no una llamada externa.
  const [incidenciasManuales, setIncidenciasManuales] = useState<IncidenciaManual[]>([]);
  const [loadingIncidenciasManuales, setLoadingIncidenciasManuales] = useState(false);
  const [nuevaIncidenciaAbierta, setNuevaIncidenciaAbierta] = useState(false);
  const [nuevaIncidenciaCaso, setNuevaIncidenciaCaso] = useState("");
  const [nuevaIncidenciaTipo, setNuevaIncidenciaTipo] = useState("");
  const [nuevaIncidenciaDescripcion, setNuevaIncidenciaDescripcion] = useState("");
  const [nuevaIncidenciaImagenes, setNuevaIncidenciaImagenes] = useState<File[]>([]);
  const [savingIncidenciaManual, setSavingIncidenciaManual] = useState(false);

  useEffect(() => {
    setLoadingIncidenciasManuales(true);
    getIncidenciasManuales(numeroDocumentoCliente)
      .then(setIncidenciasManuales)
      .finally(() => setLoadingIncidenciasManuales(false));
  }, [numeroDocumentoCliente]);

  async function handleRegistrarIncidencia(event: FormEvent) {
    event.preventDefault();
    if (!nuevaIncidenciaCaso.trim()) return;
    setSavingIncidenciaManual(true);
    try {
      const creada = await createIncidenciaManual({
        numeroDocumentoCliente,
        idOrdenServicio,
        caso: nuevaIncidenciaCaso.trim(),
        tipo: nuevaIncidenciaTipo || null,
        descripcion: nuevaIncidenciaDescripcion.trim() || null,
      });
      if (nuevaIncidenciaImagenes.length > 0) {
        await uploadAdjuntos("INCIDENCIA_MANUAL", creada.id, nuevaIncidenciaImagenes);
      }
      setIncidenciasManuales((prev) => [creada, ...prev]);
      setNuevaIncidenciaCaso("");
      setNuevaIncidenciaTipo("");
      setNuevaIncidenciaDescripcion("");
      setNuevaIncidenciaImagenes([]);
      setNuevaIncidenciaAbierta(false);
    } finally {
      setSavingIncidenciaManual(false);
    }
  }

  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set(marcados));
  const [savingIntereses, setSavingIntereses] = useState(false);

  const [nuevoInteresOpen, setNuevoInteresOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDescripcion, setNuevoDescripcion] = useState("");
  const [nuevoIcono, setNuevoIcono] = useState("");
  const [savingNuevoInteres, setSavingNuevoInteres] = useState(false);

  const [ejecutivo, setEjecutivo] = useState(ejecutivoDefault ?? "");
  const [fecha, setFecha] = useState(hoyIso());
  const [modalidad, setModalidad] = useState<ModalidadReunion>("VIRTUAL");
  const [horaInicio, setHoraInicio] = useState("");
  const [lugarOLink, setLugarOLink] = useState("");
  const [nota, setNota] = useState("");
  const [reunionImagenes, setReunionImagenes] = useState<File[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  // Reunion especial: no pide horario ahora (el cliente todavia no confirmo
  // cuando puede) — se registra el motivo y un comentario de disponibilidad,
  // y queda "En espera de horario" hasta que alguien se lo asigne despues
  // desde Reuniones (esa asignacion si valida contra el horario de atencion).
  const [reunionEspecial, setReunionEspecial] = useState(false);
  const [tipoReunionEspecial, setTipoReunionEspecial] = useState<string>("CAPACITACION");
  const [tipoReunionOtro, setTipoReunionOtro] = useState("");

  useEffect(() => {
    setSeleccionados(new Set(marcados));
  }, [marcados]);

  useEffect(() => {
    if (!ejecutivo.trim() || !fecha || esDomingo(fecha)) {
      setSlots([]);
      return;
    }
    let cancelado = false;
    setLoadingSlots(true);
    getDisponibilidad({ ejecutivo: ejecutivo.trim(), fecha, modalidad })
      .then((s) => {
        if (!cancelado) {
          setSlots(s);
          setHoraInicio((prev) => (s.includes(prev) ? prev : ""));
        }
      })
      .finally(() => {
        if (!cancelado) setLoadingSlots(false);
      });
    return () => {
      cancelado = true;
    };
  }, [ejecutivo, fecha, modalidad]);

  function toggleInteres(id: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGuardarIntereses() {
    setSavingIntereses(true);
    try {
      await setClienteIntereses(numeroDocumentoCliente, [...seleccionados]);
      onChanged();
    } finally {
      setSavingIntereses(false);
    }
  }

  async function handleAgregarInteres(event: FormEvent) {
    event.preventDefault();
    if (!nuevoNombre.trim()) return;
    setSavingNuevoInteres(true);
    try {
      await createInteres({
        nombre: nuevoNombre.trim(),
        descripcion: nuevoDescripcion.trim() || null,
        icono: nuevoIcono.trim() || null,
      });
      setNuevoNombre("");
      setNuevoDescripcion("");
      setNuevoIcono("");
      setNuevoInteresOpen(false);
      onChanged();
    } finally {
      setSavingNuevoInteres(false);
    }
  }

  async function handleAgendarReunion(event: FormEvent) {
    event.preventDefault();
    setSchedulingError(null);
    if (!ejecutivo.trim()) {
      setSchedulingError("Indicá el asesor.");
      return;
    }

    if (reunionEspecial) {
      const tipo = tipoReunionEspecial === "OTRO" ? tipoReunionOtro.trim() : tipoReunionEspecial;
      if (!tipo) {
        setSchedulingError("Indicá el motivo de la reunión especial.");
        return;
      }
      setScheduling(true);
      try {
        const creada = await createReunion({
          numeroDocumentoCliente,
          idOrdenServicio,
          ejecutivo: ejecutivo.trim(),
          modalidad,
          tipoReunion: tipo,
          lugarOLink: lugarOLink.trim() || null,
          nota: nota.trim() || null,
        });
        if (reunionImagenes.length > 0) {
          await uploadAdjuntos("REUNION", creada.id, reunionImagenes);
        }
        setLugarOLink("");
        setNota("");
        setReunionImagenes([]);
        setReunionEspecial(false);
        onChanged();
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.message) {
          setSchedulingError(String(error.response.data.message));
        } else {
          setSchedulingError("No se pudo registrar la reunión especial.");
        }
      } finally {
        setScheduling(false);
      }
      return;
    }

    if (esDomingo(fecha)) {
      setSchedulingError("No hay atención los domingos.");
      return;
    }
    if (!horaInicio) {
      setSchedulingError("Elegí un horario disponible.");
      return;
    }
    setScheduling(true);
    try {
      const creada = await createReunion({
        numeroDocumentoCliente,
        idOrdenServicio,
        ejecutivo: ejecutivo.trim(),
        fecha,
        horaInicio,
        modalidad,
        lugarOLink: lugarOLink.trim() || null,
        nota: nota.trim() || null,
      });
      if (reunionImagenes.length > 0) {
        await uploadAdjuntos("REUNION", creada.id, reunionImagenes);
      }
      setHoraInicio("");
      setLugarOLink("");
      setNota("");
      setReunionImagenes([]);
      onChanged();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        setSchedulingError(String(error.response.data.message));
      } else {
        setSchedulingError("No se pudo agendar la reunión.");
      }
    } finally {
      setScheduling(false);
    }
  }

  async function handleCambiarEstado(id: number, estado: EstadoReunion) {
    await updateReunionEstado(id, estado);
    onChanged();
  }

  return (
    <div className="stack-form">
      {telefono !== undefined && (
        <section>
          <h3 style={{ marginBottom: 4 }}>Teléfono de contacto</h3>
          {editingTelefono ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                value={telefonoInput}
                onChange={(e) => setTelefonoInput(e.target.value)}
                placeholder="Número de teléfono"
                style={{ width: 160 }}
                autoFocus
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGuardarTelefono}
                disabled={savingTelefono}
              >
                {savingTelefono ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditingTelefono(false);
                  setTelefonoInput(telefono ?? "");
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{telefono || "No registrado"}</span>
              {telefonoManual && <Badge tone="info">corregido</Badge>}
              <button type="button" className="btn btn-ghost" onClick={() => setEditingTelefono(true)}>
                {telefono ? "Corregir" : "Agregar"}
              </button>
            </p>
          )}
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Si al contactar al cliente resulta ser otro número, corregilo acá — se usará en
            adelante para llamar y escribir por WhatsApp.
          </p>
        </section>
      )}

      <section>
        <h3 style={{ marginBottom: 4 }}>Nota de llamada{notas.length > 0 ? ` (${notas.length})` : ""}</h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Para dejar constancia de qué se habló después de llamar o escribirle al cliente.
        </p>
        {loadingNotas && <p className="muted">Cargando...</p>}
        {!loadingNotas && notas.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {notas.map((n) => (
              <div key={n.id} style={{ fontSize: 13 }}>
                <strong>{new Date(n.createdAt).toLocaleString("es-PE")}</strong>
                {" — "}
                {n.usuario}: {n.nota}
                <AdjuntosGaleria entidadTipo="NOTA" entidadId={n.id} />
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleGuardarNota} className="stack-form">
          <div className="field">
            <textarea
              rows={2}
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              placeholder="Ej: contactado por WhatsApp, indicó que revisará el pago mañana."
            />
          </div>
          <ImagenesPicker files={nuevaNotaImagenes} onChange={setNuevaNotaImagenes} />
          <div className="form-actions">
            <button type="submit" className="btn btn-secondary" disabled={savingNota}>
              {savingNota ? "Guardando..." : "Guardar nota"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h3 style={{ marginBottom: 4 }}>
          Incidencias{incidencias ? ` (${incidencias.length})` : ""}
        </h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Para tener contexto antes de llamar o escribirle — viene directo de APIWorking, con
          estado real de resolución.
        </p>
        {incidencias === null && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleVerIncidencias}
            disabled={loadingIncidencias}
          >
            {loadingIncidencias ? "Cargando..." : "Ver incidencias"}
          </button>
        )}
        {errorIncidencias && <p className="error-text">{errorIncidencias}</p>}
        {incidencias !== null && incidencias.length === 0 && (
          <EmptyState title="Sin incidencias registradas" />
        )}
        {incidencias !== null && incidencias.length > 0 && (
          <>
            <div className="modulo-clientes-periodo">
              {(
                [
                  { value: "todas", label: "Todas" },
                  { value: "abiertas", label: "Abiertas" },
                  { value: "resueltas", label: "Resueltas" },
                ] as const
              ).map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={filtroIncidencias === f.value ? "btn btn-primary" : "btn btn-secondary"}
                  onClick={() => setFiltroIncidencias(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {incidenciasFiltradas.length === 0 && (
              <EmptyState title="Sin incidencias para este filtro" />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {incidenciasFiltradas.map((inc) => (
                <div key={inc.idIncidencia} style={{ fontSize: 13 }}>
                  <Badge tone={inc.resuelta ? "success" : "warning"}>
                    {inc.resuelta ? "Resuelta" : "Abierta"}
                  </Badge>{" "}
                  <strong>
                    {inc.fecha ? new Date(inc.fecha).toLocaleDateString("es-PE") : "Sin fecha"}
                  </strong>
                  {" — "}
                  {inc.caso || inc.tipo}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section>
        <h3 style={{ marginBottom: 4 }}>
          Incidencias registradas acá{incidenciasManuales.length > 0 ? ` (${incidenciasManuales.length})` : ""}
        </h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Todavía no se conectó la creación directa en APIWorking — esto queda guardado en la app
          mientras tanto.
        </p>
        {loadingIncidenciasManuales && <p className="muted">Cargando...</p>}
        {!loadingIncidenciasManuales && incidenciasManuales.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {incidenciasManuales.map((inc) => (
              <div key={inc.id} style={{ fontSize: 13 }}>
                <strong>{new Date(inc.createdAt).toLocaleDateString("es-PE")}</strong>
                {" — "}
                {inc.caso}
                {inc.tipo && ` (${inc.tipo})`}
                {inc.descripcion && (
                  <div className="muted" style={{ marginTop: 2 }}>
                    {inc.descripcion}
                  </div>
                )}
                <AdjuntosGaleria entidadTipo="INCIDENCIA_MANUAL" entidadId={inc.id} />
              </div>
            ))}
          </div>
        )}
        {!nuevaIncidenciaAbierta && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setNuevaIncidenciaAbierta(true)}
          >
            Registrar incidencia
          </button>
        )}
        {nuevaIncidenciaAbierta && (
          <form onSubmit={handleRegistrarIncidencia} className="stack-form">
            <div className="field">
              <label htmlFor="incidencia-caso">Caso</label>
              <input
                id="incidencia-caso"
                type="text"
                value={nuevaIncidenciaCaso}
                onChange={(e) => setNuevaIncidenciaCaso(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="incidencia-tipo">Tipo</label>
              <select
                id="incidencia-tipo"
                value={nuevaIncidenciaTipo}
                onChange={(e) => setNuevaIncidenciaTipo(e.target.value)}
              >
                <option value="">Sin especificar</option>
                <option value="USUARIO NO MANDA DOCUMENTOS">Usuario no manda documentos</option>
                <option value="DOCUMENTOS RECHAZADOS">Documentos rechazados</option>
                <option value="COMPROBANTES SIN ENVIAR">Comprobantes sin enviar</option>
                <option value="ERROR AL ENVIAR COMPROBANTES A SUNAT">
                  Error al enviar comprobantes a SUNAT
                </option>
                <option value="SOPORTE TECNICO">Soporte técnico</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="incidencia-descripcion">Descripción</label>
              <textarea
                id="incidencia-descripcion"
                rows={3}
                value={nuevaIncidenciaDescripcion}
                onChange={(e) => setNuevaIncidenciaDescripcion(e.target.value)}
              />
            </div>
            <ImagenesPicker files={nuevaIncidenciaImagenes} onChange={setNuevaIncidenciaImagenes} />
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setNuevaIncidenciaAbierta(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingIncidenciaManual}>
                {savingIncidenciaManual ? "Guardando..." : "Guardar incidencia"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section>
        <h3 style={{ marginBottom: 4 }}>Intereses comerciales</h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Productos que le podrían interesar a este cliente.
        </p>
        <div className="interes-list">
          {catalogo.map((item) => (
            <label key={item.id} className="interes-item">
              <input
                type="checkbox"
                checked={seleccionados.has(item.id)}
                onChange={() => toggleInteres(item.id)}
              />
              <span className="interes-item-body">
                <span className="interes-item-title">
                  {item.icono ? `${item.icono} ` : ""}
                  {item.nombre}
                </span>
                {item.descripcion && <span className="muted">{item.descripcion}</span>}
                {item.etiqueta && (
                  <span>
                    <Badge tone="info">{item.etiqueta}</Badge>
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
        <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGuardarIntereses}
            disabled={savingIntereses}
          >
            {savingIntereses ? "Guardando..." : "Guardar intereses"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setNuevoInteresOpen((v) => !v)}
          >
            {nuevoInteresOpen ? "Cancelar" : "+ Agregar producto al catálogo"}
          </button>
        </div>

        {nuevoInteresOpen && (
          <form onSubmit={handleAgregarInteres} className="stack-form" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="nuevo-interes-nombre">Producto</label>
              <input
                id="nuevo-interes-nombre"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="nuevo-interes-descripcion">Descripción (opcional)</label>
              <input
                id="nuevo-interes-descripcion"
                value={nuevoDescripcion}
                onChange={(e) => setNuevoDescripcion(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="nuevo-interes-icono">Emoji (opcional)</label>
              <input
                id="nuevo-interes-icono"
                value={nuevoIcono}
                onChange={(e) => setNuevoIcono(e.target.value)}
                placeholder="🖥️"
                style={{ maxWidth: 80 }}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-secondary" disabled={savingNuevoInteres}>
                {savingNuevoInteres ? "Agregando..." : "Agregar al catálogo"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 4 }}>Reuniones</h3>
        {reuniones.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>Sin reuniones agendadas.</p>
        ) : (
          <div className="ficha-field-list" style={{ marginBottom: 16 }}>
            {reuniones.map((r) => (
              <div key={r.id} className="ficha-field-row">
                <span className="ficha-field-label">
                  {r.estado === "EN_ESPERA"
                    ? "Sin horario asignado todavía"
                    : `${r.fecha} ${r.horaInicio}–${r.horaFin}`}
                  {" · "}
                  {r.modalidad === "VIRTUAL" ? "Virtual" : "Presencial"}
                  {" · "}
                  {r.ejecutivo}
                  {r.tipoReunion && ` · ${r.tipoReunion}`}
                  <AdjuntosGaleria entidadTipo="REUNION" entidadId={r.id} />
                </span>
                <span className="ficha-field-value">
                  <Badge
                    tone={
                      r.estado === "PROGRAMADA"
                        ? "info"
                        : r.estado === "COMPLETADA"
                          ? "success"
                          : r.estado === "EN_ESPERA"
                            ? "warning"
                            : "neutral"
                    }
                  >
                    {ESTADO_REUNION_LABEL[r.estado]}
                  </Badge>
                  {r.estado === "PROGRAMADA" && (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleCambiarEstado(r.id, "COMPLETADA")}
                      >
                        Completada
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleCambiarEstado(r.id, "CANCELADA")}
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="modulo-clientes-periodo" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className={reunionEspecial ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setReunionEspecial(false)}
          >
            Agendar reunión
          </button>
          <button
            type="button"
            className={reunionEspecial ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setReunionEspecial(true)}
          >
            Reunión especial
          </button>
        </div>

        <form onSubmit={handleAgendarReunion} className="stack-form">
          <div className="field">
            <label htmlFor="reunion-ejecutivo">Asesor</label>
            <input
              id="reunion-ejecutivo"
              value={ejecutivo}
              onChange={(e) => setEjecutivo(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Modalidad</label>
            <div className="modalidad-toggle">
              <button
                type="button"
                className={`modalidad-btn${modalidad === "VIRTUAL" ? " active" : ""}`}
                onClick={() => setModalidad("VIRTUAL")}
              >
                Virtual
                <span className="modalidad-btn-hint">30 min</span>
              </button>
              <button
                type="button"
                className={`modalidad-btn${modalidad === "PRESENCIAL" ? " active" : ""}`}
                onClick={() => setModalidad("PRESENCIAL")}
              >
                Presencial
                <span className="modalidad-btn-hint">1h30</span>
              </button>
            </div>
          </div>

          {reunionEspecial ? (
            <>
              <div className="field">
                <label htmlFor="reunion-tipo-especial">Motivo</label>
                <select
                  id="reunion-tipo-especial"
                  value={tipoReunionEspecial}
                  onChange={(e) => setTipoReunionEspecial(e.target.value)}
                >
                  {TIPOS_REUNION_ESPECIAL.map((t) => (
                    <option key={t} value={t}>
                      {t === "CAPACITACION" ? "Capacitación" : "Reforzamiento"}
                    </option>
                  ))}
                  <option value="OTRO">Otro...</option>
                </select>
              </div>
              {tipoReunionEspecial === "OTRO" && (
                <div className="field">
                  <label htmlFor="reunion-tipo-otro">Especificar motivo</label>
                  <input
                    id="reunion-tipo-otro"
                    value={tipoReunionOtro}
                    onChange={(e) => setTipoReunionOtro(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="reunion-nota">¿A qué hora y días puede el cliente?</label>
                <textarea
                  id="reunion-nota"
                  rows={2}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: martes y jueves después de las 3pm"
                />
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Queda "En espera de horario" hasta que alguien le asigne fecha y hora reales
                  desde Reuniones.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label>Fecha</label>
                <CalendarioFecha fecha={fecha} onSelect={setFecha} />
              </div>
              <div className="field">
                <label htmlFor="reunion-hora">Horario disponible</label>
                <select
                  id="reunion-hora"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  disabled={loadingSlots || slots.length === 0}
                >
                  <option value="">
                    {loadingSlots
                      ? "Buscando horarios..."
                      : slots.length === 0
                        ? "Sin horarios disponibles"
                        : "Elegí un horario"}
                  </option>
                  {slots.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="reunion-nota">Objetivo / nota (opcional)</label>
                <textarea
                  id="reunion-nota"
                  rows={2}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
              </div>
            </>
          )}

          <ImagenesPicker files={reunionImagenes} onChange={setReunionImagenes} />

          <div className="field">
            <label htmlFor="reunion-lugar">
              {modalidad === "VIRTUAL" ? "Link de la reunión (opcional)" : "Dirección (opcional)"}
            </label>
            <input
              id="reunion-lugar"
              value={lugarOLink}
              onChange={(e) => setLugarOLink(e.target.value)}
            />
          </div>
          {schedulingError && <p className="error-text">{schedulingError}</p>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={scheduling}>
              {scheduling
                ? "Guardando..."
                : reunionEspecial
                  ? "Registrar reunión especial"
                  : "Agendar reunión"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
