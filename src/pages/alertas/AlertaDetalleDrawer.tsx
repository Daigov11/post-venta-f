import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { ClienteCell } from "../../components/ui/ClienteCell";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { LlamarButton } from "../../components/ui/LlamarButton";
import { NivelAlertaPill } from "../../components/ui/StatusPill";
import { WhatsAppButton } from "../../components/ui/WhatsAppButton";
import type { Alerta } from "../../types/postventaCliente";
import { ESTADO_ALERTA_LABEL, ESTADO_ALERTA_TONE, getAlertaMeta, tipoAlertaLabel } from "../../utils/alertaLabels";
import { AlertaTrazabilidad } from "./AlertaTrazabilidad";

function DetalleItem({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="alerta-detalle-item">
      <span className="alerta-detalle-etiqueta">{etiqueta}</span>
      <span className="alerta-detalle-valor">{valor}</span>
    </div>
  );
}

// Contenido del drawer de detalle — toda la informacion completa (sin
// recortar) y todas las acciones viven aca, nunca en la fila/tarjeta de la
// lista. Trazabilidad queda colapsada por defecto (se despliega a mano).
export function AlertaDetalleDrawer({
  alerta,
  procesando,
  onMarcarVista,
  onAbrirResolver,
  onReabrir,
  onGenerarIncidencia,
}: {
  alerta: Alerta;
  procesando: boolean;
  onMarcarVista: (alerta: Alerta) => void;
  onAbrirResolver: (alerta: Alerta) => void;
  onReabrir: (alerta: Alerta) => void;
  onGenerarIncidencia: (alerta: Alerta) => void;
}) {
  const [trazaAbierta, setTrazaAbierta] = useState(false);
  const meta = getAlertaMeta(alerta.tipo);

  return (
    <div>
      <div className="alerta-detalle-header">
        <NivelAlertaPill nivel={alerta.nivel} />
        <Badge tone="neutral">{tipoAlertaLabel(alerta.tipo)}</Badge>
        <Badge tone={ESTADO_ALERTA_TONE[alerta.estado]}>{ESTADO_ALERTA_LABEL[alerta.estado]}</Badge>
        <span className="alerta-detalle-area">
          <Badge tone={meta.area ? "local" : "pending"}>{meta.area ?? "Área pendiente de validación"}</Badge>
        </span>
      </div>

      <h3 style={{ margin: "var(--space-2) 0" }}>{alerta.titulo}</h3>

      <ClienteCell
        numeroDocumentoCliente={alerta.cliente}
        nombreCliente={alerta.nombreCliente}
        sistemas={alerta.sistemas}
      />

      <div className="alerta-detalle-list" style={{ marginTop: "var(--space-4)" }}>
        <DetalleItem etiqueta="Motivo completo" valor={alerta.mensaje} />
        <DetalleItem etiqueta="Regla que generó la alerta" valor={meta.porQue} />
        <DetalleItem etiqueta="Acción recomendada" valor={meta.accionRecomendada} />
      </div>

      <h4 className="alerta-detalle-subtitulo">Datos relacionados</h4>
      <div className="ficha-field-list">
        <div className="ficha-field-row">
          <span className="ficha-field-label">RUC/DNI</span>
          <span className="ficha-field-value">{alerta.cliente}</span>
        </div>
        {alerta.idOrdenServicio && (
          <div className="ficha-field-row">
            <span className="ficha-field-label">Orden de servicio</span>
            <span className="ficha-field-value">{alerta.idOrdenServicio}</span>
          </div>
        )}
        <div className="ficha-field-row">
          <span className="ficha-field-label">Generada</span>
          <span className="ficha-field-value">{new Date(alerta.fecha).toLocaleString("es-PE")}</span>
        </div>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <CollapsibleCard
          titulo="Trazabilidad de acciones"
          abierto={trazaAbierta}
          onToggle={() => setTrazaAbierta((v) => !v)}
          tone="neutral"
        >
          <AlertaTrazabilidad numeroDocumentoCliente={alerta.cliente} />
        </CollapsibleCard>
      </div>

      <div
        className="form-actions alerta-detalle-actions"
        style={{ justifyContent: "flex-start", marginTop: "var(--space-4)" }}
      >
        <Link className="btn btn-secondary" to={`/clientes/${alerta.cliente}`}>
          Abrir ficha del cliente
        </Link>

        {alerta.estado !== "RESUELTA" && (
          <>
            {alerta.estado !== "VISTA" && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={procesando}
                onClick={() => onMarcarVista(alerta)}
              >
                Marcar vista
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={procesando}
              onClick={() => onAbrirResolver(alerta)}
            >
              Marcar resuelta
            </button>
          </>
        )}
        {alerta.estado === "RESUELTA" && (
          <button type="button" className="btn btn-ghost" disabled={procesando} onClick={() => onReabrir(alerta)}>
            Reabrir
          </button>
        )}

        {meta.esIncidenciaOSunat && (
          <>
            {alerta.telefonoEfectivo && (
              <>
                <LlamarButton
                  numeroDocumentoCliente={alerta.cliente}
                  idOrdenServicio={alerta.idOrdenServicio}
                  telefonoLimpio={alerta.telefonoEfectivo}
                  className="btn btn-secondary"
                />
                <WhatsAppButton
                  numeroDocumentoCliente={alerta.cliente}
                  idOrdenServicio={alerta.idOrdenServicio}
                  telefonoLimpio={alerta.telefonoEfectivo}
                  className="btn btn-secondary"
                />
              </>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => onGenerarIncidencia(alerta)}>
              Generar incidencia
            </button>
          </>
        )}
      </div>
    </div>
  );
}
