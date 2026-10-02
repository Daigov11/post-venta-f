import { useEffect, useState, type FormEvent } from "react";
import { updateTarea } from "../../services/tareas";
import type { TareaListItem } from "../../types/postventaCliente";

// Edicion inline del responsable — reusada por la fila de la lista y por el
// drawer de detalle, mismo comportamiento en los dos lugares.
export function ReasignarAction({ tarea, onReasignado }: { tarea: TareaListItem; onReasignado: () => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(tarea.responsable);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValor(tarea.responsable);
  }, [tarea.responsable]);

  if (!editando) {
    return (
      <button type="button" className="btn btn-secondary" onClick={() => setEditando(true)}>
        Reasignar
      </button>
    );
  }

  async function handleGuardar(event: FormEvent) {
    event.preventDefault();
    const nuevo = valor.trim();
    if (!nuevo || nuevo === tarea.responsable) {
      setEditando(false);
      return;
    }
    setSaving(true);
    try {
      await updateTarea(tarea.id, { responsable: nuevo });
      setEditando(false);
      onReasignado();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="tareas-reasignar-form" onSubmit={handleGuardar}>
      <label className="sr-only" htmlFor={`reasignar-${tarea.id}`}>
        Nuevo responsable para "{tarea.titulo}"
      </label>
      <input id={`reasignar-${tarea.id}`} value={valor} onChange={(event) => setValor(event.target.value)} autoFocus />
      <div style={{ display: "flex", gap: 4 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "..." : "Guardar"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setEditando(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
