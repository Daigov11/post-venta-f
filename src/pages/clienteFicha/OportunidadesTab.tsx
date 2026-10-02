import { EmptyState } from "../../components/ui/EmptyState";
import { EstadoOportunidadPill } from "../../components/ui/StatusPill";
import type { Oportunidad } from "../../types/postventaCliente";
import { formatValorEstimado } from "../../utils/format";

// Gestion completa (cambiar estado/responsable/siguiente accion/resultado)
// vive en la pantalla Oportunidades — aca es solo lectura para no duplicar
// ese formulario en dos lugares.
export function OportunidadesTab({ oportunidades }: { oportunidades: Oportunidad[] }) {
  return (
    <div className="ficha-grid">
      <section className="card ficha-section ficha-full-width">
        <h2>Oportunidades</h2>
        {oportunidades.length === 0 ? (
          <EmptyState title="Sin oportunidades detectadas" />
        ) : (
          <div className="ficha-field-list">
            {oportunidades.map((o) => (
              <div key={o.id} className="oportunidad-item">
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <EstadoOportunidadPill estado={o.estado} />
                  <strong>{o.titulo}</strong> — {o.mensaje} ({formatValorEstimado(o.valorEstimado)})
                </div>
                {(o.responsable || o.siguienteAccion || o.resultado) && (
                  <div className="muted" style={{ marginTop: 4 }}>
                    {o.responsable && <>Responsable: {o.responsable}. </>}
                    {o.siguienteAccion && <>Siguiente acción: {o.siguienteAccion}. </>}
                    {o.resultado && <>Resultado: {o.resultado}.</>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
