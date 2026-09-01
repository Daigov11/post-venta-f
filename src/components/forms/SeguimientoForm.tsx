import { useState, type FormEvent } from "react";
import { ImagenesPicker } from "../ui/ImagenesPicker";
import "./forms.css";

export function SeguimientoForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (comentario: string, imagenes: File[]) => void;
  submitting?: boolean;
}) {
  const [comentario, setComentario] = useState("");
  const [imagenes, setImagenes] = useState<File[]>([]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!comentario.trim()) return;
    onSubmit(comentario.trim(), imagenes);
    setComentario("");
    setImagenes([]);
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <textarea
        rows={2}
        value={comentario}
        onChange={(event) => setComentario(event.target.value)}
        placeholder="Agregar seguimiento..."
        required
      />
      <ImagenesPicker files={imagenes} onChange={setImagenes} />
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Enviando..." : "Agregar"}
      </button>
    </form>
  );
}
