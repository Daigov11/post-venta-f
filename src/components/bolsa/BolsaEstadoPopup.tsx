import { useEffect, useRef, type KeyboardEvent } from "react";
import type { BolsaEstado } from "../../types/postventaCliente";
import { calcularContenidoPopupBolsa } from "../../utils/bolsaPopupContenido";
import "./BolsaEstadoPopup.css";

export function BolsaEstadoPopup({
  estado,
  onClose,
  onVerBolsa,
}: {
  estado: BolsaEstado;
  onClose: () => void;
  onVerBolsa: () => void;
}) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const contenido = calcularContenidoPopupBolsa(estado);

  // Mueve el foco al aparecer (accesibilidad: quien navega con teclado o
  // lector de pantalla se entera de inmediato) sin bloquear el mouse/click
  // en el resto de la pagina — no hay backdrop ni focus trap.
  useEffect(() => {
    cerrarRef.current?.focus();
  }, []);

  if (!contenido) return null;

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") onClose();
  }

  return (
    <div className="bolsa-popup-container">
      <div
        className="bolsa-popup"
        role="status"
        aria-live="polite"
        aria-label={contenido.titulo}
        onKeyDown={handleKeyDown}
      >
        <div className="bolsa-popup-header">
          <h4>{contenido.titulo}</h4>
          <button
            ref={cerrarRef}
            type="button"
            className="bolsa-popup-cerrar"
            onClick={onClose}
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
        {contenido.detalle.length > 0 && (
          <ul className="bolsa-popup-detalle">
            {contenido.detalle.map((d) => (
              <li key={d.label}>
                {d.label}: <strong>{d.valor}</strong>
              </li>
            ))}
          </ul>
        )}
        <div className="bolsa-popup-actions">
          <button type="button" className="btn btn-primary" onClick={onVerBolsa}>
            {contenido.boton}
          </button>
        </div>
      </div>
    </div>
  );
}
