import { AdjuntosGaleria } from "../../components/ui/AdjuntosGaleria";
import { EmptyState } from "../../components/ui/EmptyState";
import type { Nota } from "../../types/postventaCliente";
import { formatNumber } from "../../utils/format";
import { SectionHeader, SourceTag } from "./fichaShared";

export function NotasTab({
  notas,
  usuarios,
  cantidadTrabajadores,
  cantidadTrabajadoresActualizadoEn,
  linkSistema,
  refreshingTrabajadores,
  onRefreshTrabajadores,
  usuarioCopiado,
  onCopiar,
}: {
  notas: Nota[];
  usuarios: string[];
  cantidadTrabajadores: number | null;
  cantidadTrabajadoresActualizadoEn: string | null;
  linkSistema: string | null;
  refreshingTrabajadores: boolean;
  onRefreshTrabajadores: () => void;
  usuarioCopiado: string | null;
  onCopiar: (texto: string, marcador: string) => void;
}) {
  return (
    <div className="ficha-grid">
      <section className="card ficha-section ficha-full-width">
        <SectionHeader>
          <h2>Contactos (trabajadores del sistema)</h2>
          <SourceTag origen="apiworking" />
        </SectionHeader>
        <p className="muted">Aproximado por los usuarios registrados en el sistema del cliente.</p>
        <div className="ficha-field-list">
          <div className="ficha-field-row">
            <span className="ficha-field-label">N° de trabajadores</span>
            <span className="ficha-field-value">
              {cantidadTrabajadores === null ? "Sin datos" : formatNumber(cantidadTrabajadores)}
            </span>
          </div>
          {cantidadTrabajadoresActualizadoEn && (
            <div className="ficha-field-row">
              <span className="ficha-field-label">Actualizado</span>
              <span className="ficha-field-value">
                {new Date(cantidadTrabajadoresActualizadoEn).toLocaleString("es-PE")}
              </span>
            </div>
          )}
        </div>

        {usuarios.length > 0 && (
          <div className="usuarios-list">
            {usuarios.map((usuario) => (
              <div key={usuario} className="usuarios-list-item">
                <code>{usuario}</code>
                <button type="button" className="btn btn-ghost" onClick={() => onCopiar(usuario, usuario)}>
                  {usuarioCopiado === usuario ? "Copiado ✓" : "Copiar"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRefreshTrabajadores}
            disabled={refreshingTrabajadores || !linkSistema}
          >
            {refreshingTrabajadores ? "Actualizando..." : "Actualizar"}
          </button>
          {usuarios.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onCopiar(usuarios.join("\n"), "__todos__")}
            >
              {usuarioCopiado === "__todos__" ? "Copiado ✓" : "Copiar todos"}
            </button>
          )}
        </div>
      </section>

      <section className="card ficha-section ficha-full-width">
        <SectionHeader>
          <h2>Notas ({notas.length})</h2>
          <SourceTag origen="local" />
        </SectionHeader>
        {notas.length === 0 ? (
          <EmptyState title="Sin notas registradas" />
        ) : (
          <div className="ficha-field-list">
            {notas.map((n) => (
              <div key={n.id} className="seguimiento-item">
                <div>{n.nota}</div>
                <div className="seguimiento-item-meta">
                  {n.usuario} · {new Date(n.createdAt).toLocaleString("es-PE")}
                </div>
                <AdjuntosGaleria entidadTipo="NOTA" entidadId={n.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
