import { useState, type FormEvent } from "react";
import type { PrioridadTarea } from "../../types/postventaCliente";
import "./forms.css";

export interface TareaFormValues {
  titulo: string;
  descripcion: string;
  responsable: string;
  prioridad: PrioridadTarea;
  fechaVencimiento: string;
}

export function TareaForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Partial<TareaFormValues>;
  onSubmit: (values: TareaFormValues) => void;
  onCancel?: () => void;
  submitting?: boolean;
}) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? "");
  const [responsable, setResponsable] = useState(initial?.responsable ?? "");
  const [prioridad, setPrioridad] = useState<PrioridadTarea>(initial?.prioridad ?? "MEDIA");
  const [fechaVencimiento, setFechaVencimiento] = useState(initial?.fechaVencimiento ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!titulo.trim() || !responsable.trim()) return;
    onSubmit({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      responsable: responsable.trim(),
      prioridad,
      fechaVencimiento,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="stack-form">
      <div className="field">
        <label htmlFor="tarea-titulo">Título</label>
        <input
          id="tarea-titulo"
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="tarea-descripcion">Descripción</label>
        <textarea
          id="tarea-descripcion"
          rows={3}
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="tarea-responsable">Responsable</label>
        <input
          id="tarea-responsable"
          value={responsable}
          onChange={(event) => setResponsable(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="tarea-prioridad">Prioridad</label>
        <select
          id="tarea-prioridad"
          value={prioridad}
          onChange={(event) => setPrioridad(event.target.value as PrioridadTarea)}
        >
          <option value="BAJA">Baja</option>
          <option value="MEDIA">Media</option>
          <option value="ALTA">Alta</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="tarea-fecha">Fecha límite</label>
        <input
          id="tarea-fecha"
          type="date"
          value={fechaVencimiento}
          onChange={(event) => setFechaVencimiento(event.target.value)}
        />
      </div>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Guardando..." : "Crear tarea"}
        </button>
      </div>
    </form>
  );
}
