import { useEffect, useState, type FormEvent } from "react";
import { AdjuntosGaleria } from "../ui/AdjuntosGaleria";
import { Badge, type BadgeTone } from "../ui/Badge";
import { Drawer } from "../ui/Drawer";
import { Skeleton } from "../ui/Skeleton";
import { NotaForm } from "../forms/NotaForm";
import { extractErrorMessage } from "../../hooks/useAsyncData";
import { uploadAdjuntos } from "../../services/adjuntos";
import { createNota } from "../../services/notas";
import {
  getSeguimientoDetalle,
  upsertSeguimientoEtapa,
} from "../../services/seguimientoPostVenta";
import type { EstadoPipelineSeguimiento, SeguimientoDetalle } from "../../types/postventaCliente";
import "./SeguimientoPostVentaDrawer.css";

const MEDIO_SUGERIDO = ["LLAMADA TELEFONICA", "WHATSAPP", "CORREO ELECTRONICO", "VISITA PRESENCIAL"];
const ESTADO_SUGERIDO = [
  "CONTACTADO CONFORME",
  "SIN CONTACTAR",
  "SIN RESPUESTA",
  "CONTACTADO CON INCIDENCIAS",
  "CONTACTADO SOLICITA REFUERZO",
  "CONTACTADO VOLVER A LLAMAR",
  "CONTACTADO INACTIVO POSIBLE BAJA",
  "CONTACTADO SIN USO",
  "CONTACTADO NO QUIERE RENOVAR",
];

const ESTADO_PIPELINE_TONE: Record<EstadoPipelineSeguimiento, BadgeTone> = {
  EN_PROCESO: "neutral",
  EXITOSO: "success",
  REQUIERE_ATENCION: "critical",
};

const ESTADO_PIPELINE_LABEL: Record<EstadoPipelineSeguimiento, string> = {
  EN_PROCESO: "En proceso",
  EXITOSO: "Cliente exitoso",
  REQUIERE_ATENCION: "Requiere atención",
};

export function SeguimientoPostVentaDrawer({
  numeroDocumentoCliente,
  onClose,
}: {
  numeroDocumentoCliente: string;
  onClose: () => void;
}) {
  const [detalle, setDetalle] = useState<SeguimientoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingNota, setSavingNota] = useState(false);
  const [notaAbierta, setNotaAbierta] = useState(false);

  const [fechaRealizado, setFechaRealizado] = useState("");
  const [medioComunicacion, setMedioComunicacion] = useState("");
  const [estadoSeguimiento, setEstadoSeguimiento] = useState("");
  const [resumen, setResumen] = useState("");
  const [solicitudCliente, setSolicitudCliente] = useState("");

  function cargar() {
    setLoading(true);
    setError(null);
    getSeguimientoDetalle(numeroDocumentoCliente)
      .then(setDetalle)
      .catch((err) => setError(extractErrorMessage(err, "No se pudo cargar el seguimiento.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroDocumentoCliente]);

  async function handleGuardarEtapa(event: FormEvent) {
    event.preventDefault();
    if (!detalle?.etapaActual) return;
    setSaving(true);
    try {
      await upsertSeguimientoEtapa(numeroDocumentoCliente, detalle.etapaActual.etapa, {
        fechaRealizado: fechaRealizado || null,
        medioComunicacion: medioComunicacion || null,
        estadoSeguimiento: estadoSeguimiento || null,
        resumen: resumen || null,
        solicitudCliente: solicitudCliente || null,
      });
      setFechaRealizado("");
      setMedioComunicacion("");
      setEstadoSeguimiento("");
      setResumen("");
      setSolicitudCliente("");
      cargar();
    } finally {
      setSaving(false);
    }
  }

  async function handleAgregarNota(nota: string, imagenes: File[]) {
    setSavingNota(true);
    try {
      const creada = await createNota({
        numeroDocumentoCliente,
        idOrdenServicio: detalle?.cliente.idOrdenServicio ?? null,
        nota,
      });
      if (imagenes.length > 0) {
        await uploadAdjuntos("NOTA", creada.id, imagenes);
      }
      setNotaAbierta(false);
      cargar();
    } finally {
      setSavingNota(false);
    }
  }

  return (
    <Drawer open onClose={onClose} title="Seguimiento Post Venta">
      {loading && !detalle && <Skeleton height={280} />}
      {error && !loading && (
        <div className="stack-form">
          <p className="error-text">{error}</p>
          <button type="button" className="btn btn-secondary" onClick={cargar}>
            Reintentar
          </button>
        </div>
      )}
      {detalle && (
        <div className="stack-form">
          <section>
            <div className="seguimiento-pv-header">
              <Badge tone={ESTADO_PIPELINE_TONE[detalle.cliente.estadoPipeline]}>
                {ESTADO_PIPELINE_LABEL[detalle.cliente.estadoPipeline]}
              </Badge>
              <Badge tone="neutral">
                {detalle.cliente.origen === "AUTOMATICO" ? "Automático" : "Importado (Excel)"}
              </Badge>
            </div>
            {detalle.etapaActual && (
              <p className="muted" style={{ marginTop: 8 }}>
                {detalle.etapaActual.label}
                {detalle.etapaActual.vencida && (
                  <>
                    {" "}
                    <Badge tone="warning">Toca contactar ahora</Badge>
                  </>
                )}
              </p>
            )}
          </section>

          <section>
            <h3 style={{ marginBottom: 4 }}>Etapas registradas</h3>
            {detalle.etapas.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Sin etapas registradas todavía.</p>
            ) : (
              <div className="seguimiento-pv-etapas">
                {detalle.etapas.map((e) => (
                  <div key={e.etapa} className="seguimiento-pv-etapa-item">
                    <div className="seguimiento-pv-etapa-item-header">
                      <strong>Etapa {e.etapa}</strong>
                      <span className="muted">
                        {e.fechaRealizado ? new Date(e.fechaRealizado).toLocaleDateString("es-PE") : "s/f"}
                        {e.medioComunicacion ? ` · ${e.medioComunicacion}` : ""}
                        {e.estadoSeguimiento ? ` · ${e.estadoSeguimiento}` : ""}
                      </span>
                    </div>
                    {e.resumen && <div>{e.resumen}</div>}
                    {e.solicitudCliente && (
                      <div className="muted">Solicitud del cliente: {e.solicitudCliente}</div>
                    )}
                    {e.usuario && <div className="muted">Registrado por {e.usuario}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 style={{ marginBottom: 4 }}>
              Incidencias reportadas ({detalle.incidencias.length})
            </h3>
            <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
              Vienen del historial real de APIWorking — solo lectura, para revisar si ya se
              resolvieron al conversar con el cliente.
            </p>
            {detalle.incidencias.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Sin incidencias registradas.</p>
            ) : (
              <div className="seguimiento-pv-etapas">
                {detalle.incidencias.map((inc, i) => (
                  <div key={i} className="seguimiento-pv-etapa-item">
                    <div className="muted">
                      {inc.fecha ? new Date(inc.fecha).toLocaleDateString("es-PE") : "s/f"} ·{" "}
                      {inc.persona || "—"}
                    </div>
                    <div>{inc.observacion}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 style={{ marginBottom: 4 }}>Notas ({detalle.notas.length})</h3>
            {detalle.notas.length > 0 && (
              <div className="seguimiento-pv-etapas">
                {detalle.notas.map((n) => (
                  <div key={n.id} className="seguimiento-pv-etapa-item">
                    <div>{n.nota}</div>
                    <div className="muted">
                      {n.usuario} · {new Date(n.createdAt).toLocaleString("es-PE")}
                    </div>
                    <AdjuntosGaleria entidadTipo="NOTA" entidadId={n.id} />
                  </div>
                ))}
              </div>
            )}
            {notaAbierta ? (
              <NotaForm
                onSubmit={handleAgregarNota}
                onCancel={() => setNotaAbierta(false)}
                submitting={savingNota}
              />
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setNotaAbierta(true)}
                style={{ marginTop: 8 }}
              >
                + Agregar nota
              </button>
            )}
          </section>

          {detalle.etapaActual ? (
            <section>
              <h3>Registrar etapa {detalle.etapaActual.etapa}</h3>
              <form onSubmit={handleGuardarEtapa} className="stack-form">
                <div className="field">
                  <label htmlFor="sp-fecha">Fecha realizado</label>
                  <input
                    id="sp-fecha"
                    type="date"
                    value={fechaRealizado}
                    onChange={(e) => setFechaRealizado(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="sp-medio">Medio de comunicación</label>
                  <input
                    id="sp-medio"
                    list="sp-medio-sugerido"
                    value={medioComunicacion}
                    onChange={(e) => setMedioComunicacion(e.target.value)}
                  />
                  <datalist id="sp-medio-sugerido">
                    {MEDIO_SUGERIDO.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor="sp-estado">Estado de seguimiento</label>
                  <input
                    id="sp-estado"
                    list="sp-estado-sugerido"
                    value={estadoSeguimiento}
                    onChange={(e) => setEstadoSeguimiento(e.target.value)}
                  />
                  <datalist id="sp-estado-sugerido">
                    {ESTADO_SUGERIDO.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor="sp-resumen">Resumen</label>
                  <textarea
                    id="sp-resumen"
                    rows={3}
                    value={resumen}
                    onChange={(e) => setResumen(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="sp-solicitud">Solicitud del cliente (opcional)</label>
                  <textarea
                    id="sp-solicitud"
                    rows={2}
                    value={solicitudCliente}
                    onChange={(e) => setSolicitudCliente(e.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar etapa"}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <p className="muted">
              Las 3 etapas ya se completaron — pipeline{" "}
              {ESTADO_PIPELINE_LABEL[detalle.cliente.estadoPipeline].toLowerCase()}.
            </p>
          )}
        </div>
      )}
    </Drawer>
  );
}
