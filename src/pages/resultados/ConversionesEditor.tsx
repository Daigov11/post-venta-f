import { useState } from "react";
import { registrarConversion } from "../../services/resultadoDia";
import type { ResultadoConversion, TipoConversion } from "../../types/postventaCliente";
import { TIPO_CONVERSION_LABEL, TIPOS_CONVERSION } from "../../utils/conversionLabels";

function FilaConversion({
  resultadoDiaId,
  tipo,
  conversion,
  onChanged,
}: {
  resultadoDiaId: number;
  tipo: TipoConversion;
  conversion: ResultadoConversion | undefined;
  onChanged: () => void;
}) {
  const [cantidad, setCantidad] = useState(String(conversion?.cantidad ?? 0));
  const [detalle, setDetalle] = useState(conversion?.detalle ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = cantidad !== String(conversion?.cantidad ?? 0) || detalle !== (conversion?.detalle ?? "");

  async function handleGuardar() {
    const c = Number(cantidad);
    if (!Number.isInteger(c) || c < 0) return;
    setSaving(true);
    try {
      await registrarConversion(resultadoDiaId, { tipo, cantidad: c, detalle: detalle.trim() || null });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="resultado-accion-row">
      <span className="resultado-accion-tipo">{TIPO_CONVERSION_LABEL[tipo]}</span>
      <div className="field">
        <label htmlFor={`conversion-cantidad-${tipo}`}>Cantidad</label>
        <input
          id={`conversion-cantidad-${tipo}`}
          type="number"
          min={0}
          step={1}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
      </div>
      <div className="field" style={{ flex: 1 }}>
        <label htmlFor={`conversion-detalle-${tipo}`}>Detalle (opcional)</label>
        <input
          id={`conversion-detalle-${tipo}`}
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder="Ej. cliente, plan o módulo"
        />
      </div>
      <div className="form-actions" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="btn btn-primary" disabled={!dirty || saving} onClick={handleGuardar}>
          {saving ? "..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

export function ConversionesEditor({
  resultadoDiaId,
  conversiones,
  onChanged,
}: {
  resultadoDiaId: number;
  conversiones: ResultadoConversion[];
  onChanged: () => void;
}) {
  const porTipo = new Map(conversiones.map((c) => [c.tipo, c]));

  return (
    <section className="card ficha-section">
      <h2>Conversiones</h2>
      <p className="muted">Los 3 tipos son fijos — dejá en 0 el que no aplique hoy.</p>
      <div className="resultado-accion-list">
        {TIPOS_CONVERSION.map((tipo) => (
          <FilaConversion
            key={tipo}
            resultadoDiaId={resultadoDiaId}
            tipo={tipo}
            conversion={porTipo.get(tipo)}
            onChanged={onChanged}
          />
        ))}
      </div>
    </section>
  );
}
