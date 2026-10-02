import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { crearIncidencia, getTiposIncidencia } from "../../services/incidencias";
import type { TipoIncidenciaCatalogo } from "../../types/postventaCliente";

export interface ClienteInfoIncidencia {
  nombre: string;
  ruc: string;
  ordenVigente?: number | string | null;
}

// Compartido entre la ficha del cliente (IncidenciasTab), el drawer
// "Agendar / Interes" (InteresesReunionesPanel, usado desde Clientes/
// Alertas/Renovaciones/Movimientos/Oportunidades) y el ActionMenu de Alertas
// ("Generar incidencia") — una sola forma de crear una incidencia REAL en
// APIWorking, nunca duplicada.
export function CrearIncidenciaDialog({
  numeroDocumentoCliente,
  clienteInfo,
  tituloInicial,
  descripcionInicial,
  onClose,
  onCreada,
}: {
  numeroDocumentoCliente: string;
  clienteInfo?: ClienteInfoIncidencia;
  tituloInicial?: string;
  descripcionInicial?: string;
  onClose: () => void;
  onCreada?: (resultado: { numero: string | null; message: string }) => void;
}) {
  const [tipos, setTipos] = useState<TipoIncidenciaCatalogo[] | null>(null);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [errorTipos, setErrorTipos] = useState<string | null>(null);

  const [titulo, setTitulo] = useState(tituloInicial ?? "");
  const [descripcion, setDescripcion] = useState(descripcionInicial ?? "");
  const [tipo, setTipo] = useState<number | "">("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoadingTipos(true);
    setErrorTipos(null);
    getTiposIncidencia()
      .then((res) => {
        if (!cancelado) setTipos(res.data);
      })
      .catch(() => {
        if (!cancelado) setErrorTipos("No se pudo cargar el catálogo de tipos de incidencia.");
      })
      .finally(() => {
        if (!cancelado) setLoadingTipos(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const valido = titulo.trim().length > 0 && descripcion.trim().length > 0 && tipo !== "";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valido) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const resultado = await crearIncidencia({
        numeroDocumentoCliente,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo,
      });
      onCreada?.(resultado);
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo crear la incidencia.";
      setErrorEnvio(message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Crear incidencia</h3>
        <p className="muted">
          Se crea directamente en APIWorking, sobre la orden de servicio vigente de este cliente.
          Se asigna automáticamente (asignación automática confirmada) — no hay todavía un catálogo
          de personas para elegir a mano.
        </p>
        {clienteInfo && (
          <div className="ficha-field-list">
            <div className="ficha-field-row">
              <span className="ficha-field-label">Cliente</span>
              <span className="ficha-field-value">{clienteInfo.nombre}</span>
            </div>
            <div className="ficha-field-row">
              <span className="ficha-field-label">RUC/DNI</span>
              <span className="ficha-field-value">{clienteInfo.ruc}</span>
            </div>
            {clienteInfo.ordenVigente && (
              <div className="ficha-field-row">
                <span className="ficha-field-label">Orden de servicio</span>
                <span className="ficha-field-value">{clienteInfo.ordenVigente}</span>
              </div>
            )}
            <div className="ficha-field-row">
              <span className="ficha-field-label"></span>
              <Link className="btn-link-inline" to={`/clientes/${numeroDocumentoCliente}`}>
                Abrir ficha del cliente
              </Link>
            </div>
          </div>
        )}
        {loadingTipos && <p className="muted">Cargando catálogo de tipos...</p>}
        {errorTipos && <p className="error-text">{errorTipos}</p>}
        {!loadingTipos && tipos && (
          <form className="stack-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="incidencia-tipo">Tipo</label>
              <select
                id="incidencia-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value ? Number(e.target.value) : "")}
                required
              >
                <option value="">Seleccionar...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="incidencia-titulo">Título</label>
              <input
                id="incidencia-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="incidencia-descripcion">Descripción</label>
              <textarea
                id="incidencia-descripcion"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
              />
            </div>
            {errorEnvio && <p className="error-text">{errorEnvio}</p>}
            <div className="confirm-dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={!valido || enviando}>
                {enviando ? "Creando..." : "Crear incidencia"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
