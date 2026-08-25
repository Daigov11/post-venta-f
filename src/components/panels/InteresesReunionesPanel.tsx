import axios from "axios";
import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { updateClienteMetadata } from "../../services/clientes";
import { createInteres, setClienteIntereses } from "../../services/intereses";
import { getHistorialSeguimiento } from "../../services/historial";
import { createReunion, getDisponibilidad, updateReunionEstado } from "../../services/reuniones";
import type {
  EstadoReunion,
  HistorialSeguimientoEvento,
  InteresCatalogo,
  ModalidadReunion,
  Reunion,
} from "../../types/postventaCliente";

const ESTADO_REUNION_LABEL: Record<EstadoReunion, string> = {
  PROGRAMADA: "Programada",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

function esDomingo(fecha: string): boolean {
  if (!fecha) return false;
  return new Date(`${fecha}T00:00:00Z`).getUTCDay() === 0;
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// Calendario visual para elegir la fecha de la reunion — reemplaza el
// <input type="date"> nativo por el mismo patron ya usado en otros productos
// (pagos.apiworking.com.pe): grilla de mes con navegacion, domingos y fechas
// pasadas deshabilitados directamente en la celda (no hace falta el aviso de
// texto aparte que tenia el input nativo).
function CalendarioFecha({
  fecha,
  onSelect,
}: {
  fecha: string;
  onSelect: (iso: string) => void;
}) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicial = fecha ? new Date(`${fecha}T00:00:00`) : hoy;
  const [mesVista, setMesVista] = useState(
    () => new Date(inicial.getFullYear(), inicial.getMonth(), 1)
  );

  const anio = mesVista.getFullYear();
  const mes = mesVista.getMonth();
  const offset = (new Date(anio, mes, 1).getDay() + 6) % 7; // 0 = lunes
  const totalDias = new Date(anio, mes + 1, 0).getDate();
  const enMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth();

  const celdas: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];

  return (
    <div className="calendario-fecha">
      <div className="calendario-fecha-header">
        <button
          type="button"
          className="calendario-fecha-nav"
          onClick={() => setMesVista((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          disabled={enMesActual}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <strong style={{ textTransform: "capitalize" }}>
          {MESES[mes]} {anio}
        </strong>
        <button
          type="button"
          className="calendario-fecha-nav"
          onClick={() => setMesVista((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>
      <div className="calendario-fecha-dow">
        {DIAS_SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="calendario-fecha-grid">
        {celdas.map((dia, i) => {
          if (dia === null) return <span key={`vacio-${i}`} />;
          const iso = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const fechaCelda = new Date(anio, mes, dia);
          const deshabilitado = fechaCelda < hoy || fechaCelda.getDay() === 0;
          return (
            <button
              key={iso}
              type="button"
              className={`calendario-fecha-dia${iso === fecha ? " seleccionado" : ""}`}
              disabled={deshabilitado}
              onClick={() => onSelect(iso)}
            >
              {dia}
            </button>
          );
        })}
      </div>
      <p className="muted calendario-fecha-nota">Los domingos no hay atención.</p>
    </div>
  );
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

  const [incidencias, setIncidencias] = useState<HistorialSeguimientoEvento[] | null>(null);
  const [loadingIncidencias, setLoadingIncidencias] = useState(false);
  const [errorIncidencias, setErrorIncidencias] = useState<string | null>(null);

  async function handleVerIncidencias() {
    setLoadingIncidencias(true);
    setErrorIncidencias(null);
    try {
      const res = await getHistorialSeguimiento(idOrdenServicio);
      setIncidencias(
        res.data.filter((ev) => ev.estado.trim().toUpperCase().includes("INCIDENCIA"))
      );
    } catch {
      setErrorIncidencias("No se pudieron cargar las incidencias.");
    } finally {
      setLoadingIncidencias(false);
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
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

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
      await createReunion({
        numeroDocumentoCliente,
        idOrdenServicio,
        ejecutivo: ejecutivo.trim(),
        fecha,
        horaInicio,
        modalidad,
        lugarOLink: lugarOLink.trim() || null,
        nota: nota.trim() || null,
      });
      setHoraInicio("");
      setLugarOLink("");
      setNota("");
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
        <h3 style={{ marginBottom: 4 }}>
          Incidencias{incidencias ? ` (${incidencias.length})` : ""}
        </h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Para tener contexto antes de llamar o escribirle — viene del historial real de
          APIWorking.
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {incidencias.map((ev, i) => (
              <div key={`inc-${ev.fecha ?? "sf"}-${i}`} style={{ fontSize: 13 }}>
                <strong>{ev.fecha ? new Date(ev.fecha).toLocaleDateString("es-PE") : "Sin fecha"}</strong>
                {" — "}
                {ev.observacion || ev.estado}
              </div>
            ))}
          </div>
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
                  {r.fecha} {r.horaInicio}–{r.horaFin} · {r.modalidad === "VIRTUAL" ? "Virtual" : "Presencial"}
                  {" · "}
                  {r.ejecutivo}
                </span>
                <span className="ficha-field-value">
                  <Badge
                    tone={
                      r.estado === "PROGRAMADA"
                        ? "info"
                        : r.estado === "COMPLETADA"
                          ? "success"
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
            <label htmlFor="reunion-lugar">
              {modalidad === "VIRTUAL" ? "Link de la reunión (opcional)" : "Dirección (opcional)"}
            </label>
            <input
              id="reunion-lugar"
              value={lugarOLink}
              onChange={(e) => setLugarOLink(e.target.value)}
            />
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
          {schedulingError && <p className="error-text">{schedulingError}</p>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={scheduling}>
              {scheduling ? "Agendando..." : "Agendar reunión"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
