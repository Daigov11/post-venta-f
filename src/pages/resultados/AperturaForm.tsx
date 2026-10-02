import { useState, type FormEvent } from "react";
import { EmptyState } from "../../components/ui/EmptyState";

export function AperturaForm({
  fecha,
  onAbrir,
  submitting,
}: {
  fecha: string;
  onAbrir: (montoApertura: number) => void;
  submitting: boolean;
}) {
  const [monto, setMonto] = useState("");
  const montoNumero = Number(monto);
  const montoValido = monto.trim() !== "" && Number.isFinite(montoNumero) && montoNumero >= 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!montoValido) return;
    onAbrir(montoNumero);
  }

  return (
    <div className="card">
      <EmptyState
        title="Todavía no abriste el día de hoy"
        message={`Registra el monto de apertura en soles para empezar a registrar el día ${fecha}.`}
      />
      <form className="stack-form" onSubmit={handleSubmit} style={{ maxWidth: 320, margin: "0 auto" }}>
        <div className="field">
          <label htmlFor="monto-apertura">Monto de apertura (S/)</label>
          <input
            id="monto-apertura"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={monto}
            onChange={(event) => setMonto(event.target.value)}
            required
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={!montoValido || submitting}>
            {submitting ? "Abriendo..." : "Abrir día"}
          </button>
        </div>
      </form>
    </div>
  );
}
