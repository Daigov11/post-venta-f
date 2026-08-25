import { Drawer } from "../ui/Drawer";
import type { BajaHistorico } from "../../types/postventaCliente";

function Campo({ label, valor }: { label: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="ficha-field-row">
      <span className="ficha-field-label">{label}</span>
      <span className="ficha-field-value" style={{ textAlign: "left", maxWidth: "70%" }}>
        {valor}
      </span>
    </div>
  );
}

// Solo lectura — referencia importada de clientes_de_baja.xlsx (seguimiento
// que ya se le hizo a este cliente antes de esta plataforma). No es un
// pipeline activo, no se puede editar desde aca.
export function BajaHistoricoDrawer({
  nombreCliente,
  historico,
  onClose,
}: {
  nombreCliente: string;
  historico: BajaHistorico;
  onClose: () => void;
}) {
  return (
    <Drawer open onClose={onClose} title={`Seguimiento anterior — ${nombreCliente}`}>
      <p className="muted">
        Referencia histórica importada del Excel de seguimiento de bajas — no es un pipeline
        activo, solo contexto de lo que ya se hizo.
      </p>

      <div className="ficha-field-list">
        <Campo
          label="Fecha de baja/suspensión"
          valor={
            historico.fechaBajaSuspension
              ? new Date(historico.fechaBajaSuspension).toLocaleDateString("es-PE")
              : null
          }
        />
        <Campo label="Estado actual (al momento del seguimiento)" valor={historico.estadoActual} />
      </div>

      <h3 style={{ marginTop: 16, marginBottom: 4 }}>Primer seguimiento</h3>
      <div className="ficha-field-list">
        <Campo
          label="Fecha"
          valor={
            historico.fechaSeguimiento
              ? new Date(historico.fechaSeguimiento).toLocaleDateString("es-PE")
              : null
          }
        />
        <Campo label="Medio" valor={historico.medioComunicacion} />
        <Campo label="Estado" valor={historico.estadoSeguimiento} />
      </div>
      {historico.resumenSeguimiento && (
        <p style={{ fontSize: 13, marginTop: 8 }}>{historico.resumenSeguimiento}</p>
      )}

      {(historico.observacionEncargado ||
        historico.resumenSeguimientoEncargado ||
        historico.estadoSeguimientoEncargado) && (
        <>
          <h3 style={{ marginTop: 16, marginBottom: 4 }}>Revisión del encargado de área</h3>
          <div className="ficha-field-list">
            <Campo
              label="Fecha de observación"
              valor={
                historico.fechaObservacionEncargado
                  ? new Date(historico.fechaObservacionEncargado).toLocaleDateString("es-PE")
                  : null
              }
            />
          </div>
          {historico.observacionEncargado && (
            <p style={{ fontSize: 13, marginTop: 8 }}>{historico.observacionEncargado}</p>
          )}
          <div className="ficha-field-list" style={{ marginTop: 8 }}>
            <Campo
              label="Fecha de seguimiento"
              valor={
                historico.fechaSeguimientoEncargado
                  ? new Date(historico.fechaSeguimientoEncargado).toLocaleDateString("es-PE")
                  : null
              }
            />
            <Campo label="Medio" valor={historico.medioComunicacionEncargado} />
            <Campo label="Estado" valor={historico.estadoSeguimientoEncargado} />
          </div>
          {historico.resumenSeguimientoEncargado && (
            <p style={{ fontSize: 13, marginTop: 8 }}>{historico.resumenSeguimientoEncargado}</p>
          )}
        </>
      )}
    </Drawer>
  );
}
