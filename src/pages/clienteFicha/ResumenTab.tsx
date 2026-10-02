import type { FormEvent } from "react";
import type { Alerta, EstadoPostVenta, PostVentaCliente } from "../../types/postventaCliente";
import { AlertasActivasResumen } from "./AlertasActivasResumen";
import { SectionHeader, SourceTag } from "./fichaShared";

export function ResumenTab({
  cliente,
  alertas,
  estadoManual,
  onEstadoManualChange,
  segmentoManual,
  onSegmentoManualChange,
  etiquetasText,
  onEtiquetasTextChange,
  observacionGeneral,
  onObservacionGeneralChange,
  savingMetadata,
  onSaveMetadata,
}: {
  cliente: PostVentaCliente;
  alertas: Alerta[];
  estadoManual: EstadoPostVenta | "";
  onEstadoManualChange: (value: EstadoPostVenta | "") => void;
  segmentoManual: string;
  onSegmentoManualChange: (value: string) => void;
  etiquetasText: string;
  onEtiquetasTextChange: (value: string) => void;
  observacionGeneral: string;
  onObservacionGeneralChange: (value: string) => void;
  savingMetadata: boolean;
  onSaveMetadata: (event: FormEvent) => void;
}) {
  return (
    <div className="ficha-grid">
      <section className="card ficha-section">
        <SectionHeader>
          <h2>Resumen</h2>
          <SourceTag origen="apiworking" />
        </SectionHeader>
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
                : (cliente.ubicacion?.raw ?? "No determinado")}
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
            <span className="ficha-field-value">{cliente.ordenVigente.distribuidor?.nombre ?? "—"}</span>
          </div>
        </div>
      </section>

      <AlertasActivasResumen alertas={alertas} numeroDocumentoCliente={cliente.numeroDocumentoCliente} />

      <section className="card ficha-section">
        <SectionHeader>
          <h2>Gestión Post Venta</h2>
          <SourceTag origen="local" />
        </SectionHeader>
        <form className="stack-form" onSubmit={onSaveMetadata}>
          <div className="field">
            <label htmlFor="estado-manual">Estado (override manual)</label>
            <select
              id="estado-manual"
              value={estadoManual}
              onChange={(event) => onEstadoManualChange(event.target.value as EstadoPostVenta | "")}
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
              onChange={(event) => onSegmentoManualChange(event.target.value)}
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
              onChange={(event) => onEtiquetasTextChange(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="observacion-general">Observación general</label>
            <textarea
              id="observacion-general"
              rows={3}
              value={observacionGeneral}
              onChange={(event) => onObservacionGeneralChange(event.target.value)}
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
  );
}
