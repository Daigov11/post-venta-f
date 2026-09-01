import { useEffect, useMemo, useState } from "react";

const MAX_IMAGENES = 5;
const MAX_TAMANO_MB = 8;

// Selector de imagenes "en espera" — se usa dentro de un form (nota,
// incidencia manual, etc.) antes de guardar. El archivo recien se sube
// despues de crear el comentario/registro, cuando ya existe un id al que
// asociarlo (ver uploadAdjuntos en services/adjuntos.ts).
export function ImagenesPicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const nuevos = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (nuevos.length === 0) return;
    if (nuevos.some((f) => !f.type.startsWith("image/"))) {
      setError("Solo se permiten imágenes.");
      return;
    }
    if (nuevos.some((f) => f.size > MAX_TAMANO_MB * 1024 * 1024)) {
      setError(`Cada imagen debe pesar menos de ${MAX_TAMANO_MB}MB.`);
      return;
    }
    setError(null);
    onChange([...files, ...nuevos].slice(0, MAX_IMAGENES));
  }

  function handleRemove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="field">
      <label>Imágenes (opcional)</label>
      {files.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} style={{ position: "relative" }}>
              <img
                src={previews[index]}
                alt={file.name}
                style={{
                  width: 64,
                  height: 64,
                  objectFit: "cover",
                  borderRadius: 6,
                  border: "1px solid #ddd",
                }}
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                title="Quitar"
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "none",
                  background: "#c0392b",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  lineHeight: "20px",
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {files.length < MAX_IMAGENES && (
        <input type="file" accept="image/*" multiple onChange={handlePick} />
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
