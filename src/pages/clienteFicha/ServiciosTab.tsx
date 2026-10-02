import { Badge } from "../../components/ui/Badge";
import type { PostVentaCliente } from "../../types/postventaCliente";
import { formatCurrency, formatNumber } from "../../utils/format";
import { SectionHeader, SourceTag } from "./fichaShared";

export function ServiciosTab({ cliente }: { cliente: PostVentaCliente }) {
  return (
    <div className="ficha-grid">
      <section className="card ficha-section">
        <SectionHeader>
          <h2>Sistema</h2>
          <SourceTag origen="apiworking" />
        </SectionHeader>
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
            <span className="ficha-field-value">{formatNumber(cliente.cantidadComprobantesHistorico)}</span>
          </div>
        </div>
      </section>

      <section className="card ficha-section">
        <SectionHeader>
          <h2>Equipo</h2>
          <SourceTag origen="apiworking" />
        </SectionHeader>
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

      <section className="card ficha-section ficha-full-width">
        <SectionHeader>
          <h2>Historial de órdenes de servicio ({cliente.cantidadOs})</h2>
          <SourceTag origen="apiworking" />
        </SectionHeader>
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
    </div>
  );
}
