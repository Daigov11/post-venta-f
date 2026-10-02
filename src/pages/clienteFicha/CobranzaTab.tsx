import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import type { PagoNormalizado, PostVentaCliente } from "../../types/postventaCliente";
import { formatCurrency, formatNumber } from "../../utils/format";
import { SectionHeader, SourceTag } from "./fichaShared";

export function CobranzaTab({
  cliente,
  ultimoPago,
}: {
  cliente: PostVentaCliente;
  ultimoPago: PagoNormalizado | null;
}) {
  return (
    <div className="ficha-grid">
      <section className="card ficha-section">
        <SectionHeader>
          <h2>Financiero</h2>
          <SourceTag origen="apiworking" />
        </SectionHeader>
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
            <span className="ficha-field-value">{formatCurrency(cliente.ordenVigente.deudaProyectada)}</span>
          </div>
          <div className="ficha-field-row">
            <span className="ficha-field-label">Facturas disponibles</span>
            <span className="ficha-field-value">{cliente.ordenVigente.facturas.disponibles}</span>
          </div>
          <div className="ficha-field-row">
            <span className="ficha-field-label">Facturas de equipo disponibles</span>
            <span className="ficha-field-value">{cliente.ordenVigente.facturas.equipoDisponibles}</span>
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
        <SectionHeader>
          <h2>Facturación y SUNAT</h2>
          <SourceTag origen="apiworking" />
        </SectionHeader>
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
                {formatNumber(cliente.ordenVigente.postVentaExtra.cantidadComprobantesMensual)} (BV{" "}
                {cliente.ordenVigente.postVentaExtra.comprobantesMensualDesglose.bv} · FV{" "}
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
                  ? new Date(cliente.ordenVigente.postVentaExtra.fechaActivacion).toLocaleDateString("es-PE")
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
                  ? new Date(cliente.ordenVigente.postVentaExtra.fechaInstalacion).toLocaleDateString("es-PE")
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
              <span className="ficha-field-value">{cliente.ordenVigente.postVentaExtra.meses ?? "No determinado"}</span>
            </div>
          </div>
        ) : (
          <EmptyState message="Esta orden de servicio es anterior al rango disponible del endpoint de facturación (25-09-2022) o todavía no aparece en el último sync." />
        )}
      </section>
    </div>
  );
}
