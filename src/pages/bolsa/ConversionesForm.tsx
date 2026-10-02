import { useState, type FormEvent } from "react";
import { registrarConversionBolsa } from "../../services/bolsa";
import { CATEGORIAS_CONVERSION_SELECCIONABLES, TIPO_BOLSA_CONVERSION_LABEL } from "../../utils/bolsaLabels";
import type { BolsaConversion, BolsaEstado, TipoBolsaConversion } from "../../types/postventaCliente";

// Categorias fijas (ajuste: antes era texto libre) — cubre lo que no tiene
// ningun campo real en el sistema (recuperacion de cliente, venta de
// producto, apiLoyalty/apiReview) ademas de duplicar, para consistencia
// visual, las dos que ya se cuentan solas via Oportunidades ganadas
// (cambio de periodicidad, adquisicion de equipo) por si alguien quiere
// dejar una nota manual de todos modos.
export function ConversionesForm({ onRegistrada }: { onRegistrada: (estado: BolsaEstado) => void }) {
  const [tipo, setTipo] = useState<TipoBolsaConversion>("RECUPERACION_CLIENTE");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      const estado = await registrarConversionBolsa({
        tipo,
        descripcion: descripcion.trim() || null,
      });
      onRegistrada(estado);
      setDescripcion("");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="bolsa-conversion-tipo">Categoría</label>
        <select
          id="bolsa-conversion-tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoBolsaConversion)}
        >
          {CATEGORIAS_CONVERSION_SELECCIONABLES.map((t) => (
            <option key={t} value={t}>
              {TIPO_BOLSA_CONVERSION_LABEL[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="bolsa-conversion-descripcion">Detalle (opcional)</label>
        <textarea
          id="bolsa-conversion-descripcion"
          rows={2}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-secondary" disabled={guardando}>
          {guardando ? "Guardando..." : "Agregar"}
        </button>
      </div>
    </form>
  );
}

export function ConversionesLista({ conversiones }: { conversiones: BolsaConversion[] }) {
  if (conversiones.length === 0) return <p className="muted">Sin conversiones registradas todavía.</p>;
  return (
    <ul className="tarea-detalle-historial">
      {conversiones.map((c) => (
        <li key={c.id}>
          <strong>{TIPO_BOLSA_CONVERSION_LABEL[c.tipo]}</strong>
          {c.descripcion && <> — {c.descripcion}</>}
          <div className="muted">
            {c.createdBy} · {new Date(c.createdAt).toLocaleTimeString("es-PE")}
          </div>
        </li>
      ))}
    </ul>
  );
}
