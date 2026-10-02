import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { NivelAlertaPill } from "../../components/ui/StatusPill";
import type { Alerta, NivelAlerta } from "../../types/postventaCliente";
import { tipoAlertaLabel } from "../../utils/alertaLabels";
import { SectionHeader, SourceTag } from "./fichaShared";

const NIVEL_RANK: Record<NivelAlerta, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 };
const MAX_VISIBLE = 3;

// Reutiliza las alertas que ya vienen con la ficha (GET /api/clientes/:id —
// ver clientes.controller.ts, mismo motor y mismo merge de estado manual que
// /api/alertas) — no dispara una consulta aparte ni una por fila.
export function AlertasActivasResumen({
  alertas,
  numeroDocumentoCliente,
}: {
  alertas: Alerta[];
  numeroDocumentoCliente: string;
}) {
  const ordenadas = [...alertas].sort((a, b) => NIVEL_RANK[b.nivel] - NIVEL_RANK[a.nivel]);
  const criticasOAltas = alertas.filter((a) => a.nivel === "CRITICAL" || a.nivel === "WARNING").length;
  const prioritarias = ordenadas.slice(0, MAX_VISIBLE);
  const restantes = alertas.length - prioritarias.length;

  return (
    <section className="card ficha-section">
      <SectionHeader>
        <h2>Alertas activas</h2>
        <SourceTag origen="local" />
      </SectionHeader>

      {alertas.length === 0 ? (
        <EmptyState title="Sin alertas activas" />
      ) : (
        <>
          <div className="alertas-resumen-conteo">
            <Badge tone="neutral">{alertas.length} activa(s)</Badge>
            {criticasOAltas > 0 && (
              <Badge tone="critical">⚠ {criticasOAltas} crítica(s)/alta(s)</Badge>
            )}
          </div>

          <div className="alertas-resumen-lista">
            {prioritarias.map((a) => (
              <div key={a.id} className="alertas-resumen-item">
                <NivelAlertaPill nivel={a.nivel} />
                <span className="alertas-resumen-item-texto">
                  <strong>{tipoAlertaLabel(a.tipo)}</strong> — {a.mensaje}
                </span>
              </div>
            ))}
          </div>

          {restantes > 0 && <p className="muted alertas-resumen-mas">+{restantes} más</p>}
        </>
      )}

      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: "var(--space-3)" }}>
        <Link className="btn btn-secondary" to={`/alertas?cliente=${numeroDocumentoCliente}`}>
          Ver todas las alertas
        </Link>
      </div>
    </section>
  );
}
