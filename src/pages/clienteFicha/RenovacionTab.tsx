import { Badge } from "../../components/ui/Badge";
import type { PostVentaCliente } from "../../types/postventaCliente";
import { formatValorEstimado } from "../../utils/format";
import { SectionHeader, SourceTag } from "./fichaShared";

export function RenovacionTab({ cliente }: { cliente: PostVentaCliente }) {
  return (
    <div className="ficha-grid">
      <section className="card ficha-section">
        <SectionHeader>
          <h2>Plan y renovación</h2>
          <SourceTag origen="apiworking" />
        </SectionHeader>
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
    </div>
  );
}
