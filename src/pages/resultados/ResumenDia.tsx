import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import type { ResultadoDia } from "../../types/postventaCliente";
import { formatCurrency } from "../../utils/format";
import { TIPO_CONVERSION_LABEL, TIPOS_CONVERSION } from "../../utils/conversionLabels";

export function ResumenDia({ resultado }: { resultado: ResultadoDia }) {
  // Reutilizado tambien para el detalle de un dia historico (que puede
  // seguir ABIERTO, ej. el dia de otro usuario en curso) — no asumir CERRADO.
  const cerrado = resultado.estado === "CERRADO";
  return (
    <div className="ficha-grid">
      <section className="card ficha-section">
        <h2>{cerrado ? "Cierre del día" : "Día en progreso"}</h2>
        <div className="ficha-field-list">
          <div className="ficha-field-row">
            <span className="ficha-field-label">Estado</span>
            <span className="ficha-field-value">
              <Badge tone={cerrado ? "success" : "warning"}>{cerrado ? "Cerrado" : "Abierto"}</Badge>
            </span>
          </div>
          <div className="ficha-field-row">
            <span className="ficha-field-label">Monto de apertura</span>
            <span className="ficha-field-value">{formatCurrency(resultado.montoApertura)}</span>
          </div>
          <div className="ficha-field-row">
            <span className="ficha-field-label">Apertura</span>
            <span className="ficha-field-value">
              {new Date(resultado.horaApertura).toLocaleString("es-PE")}
            </span>
          </div>
          <div className="ficha-field-row">
            <span className="ficha-field-label">Cierre</span>
            <span className="ficha-field-value">
              {resultado.horaCierre ? new Date(resultado.horaCierre).toLocaleString("es-PE") : "—"}
            </span>
          </div>
          {resultado.observacionCierre && (
            <div className="ficha-field-row">
              <span className="ficha-field-label">Observación</span>
              <span className="ficha-field-value">{resultado.observacionCierre}</span>
            </div>
          )}
        </div>
      </section>

      {resultado.avisoAdministracion && (
        <section className="card ficha-section ficha-full-width" style={{ borderColor: "var(--color-critical)" }}>
          <h2>⚠ Aviso a administración</h2>
          <p style={{ margin: 0 }}>{resultado.motivoAviso}</p>
        </section>
      )}

      <section className="card ficha-section ficha-full-width">
        <h2>Acciones del día</h2>
        {resultado.acciones.length === 0 ? (
          <EmptyState title="No se registraron acciones" />
        ) : (
          <div className="ficha-field-list">
            {resultado.acciones.map((a) => (
              <div key={a.id} className="ficha-field-row">
                <span className="ficha-field-label">{a.tipo}</span>
                <span className="ficha-field-value">
                  {a.realizadas} realizada(s) · {a.noRealizadas} no realizada(s)
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card ficha-section ficha-full-width">
        <h2>Conversiones del día</h2>
        <div className="ficha-field-list">
          {TIPOS_CONVERSION.map((tipo) => {
            const conversion = resultado.conversiones.find((c) => c.tipo === tipo);
            return (
              <div key={tipo} className="ficha-field-row">
                <span className="ficha-field-label">{TIPO_CONVERSION_LABEL[tipo]}</span>
                <span className="ficha-field-value">
                  {conversion?.cantidad ?? 0}
                  {conversion?.detalle ? ` — ${conversion.detalle}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
