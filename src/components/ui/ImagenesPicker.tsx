import { useEffect, useMemo, useState } from "react";

const MAX_IMAGENES = 5;
const MAX_TAMANO_MB = 8;

export interface ResultadoAgregarImagenes {
  files: File[];
  error: string | null;
}

// Validacion + merge compartida entre el picker (click, drag&drop, paste
// sobre el propio widget) y el paste directo sobre el textarea del
// comentario en cada formulario que lo usa (ver extraerImagenesDePortapapeles
// mas abajo) — un solo lugar con las reglas de tipo/tamano/cantidad.
export function agregarImagenes(actuales: File[], nuevas: File[]): ResultadoAgregarImagenes {
  if (nuevas.length === 0) return { files: actuales, error: null };
  if (nuevas.some((f) => !f.type.startsWith("image/"))) {
    return { files: actuales, error: "Solo se permiten imágenes." };
  }
  if (nuevas.some((f) => f.size > MAX_TAMANO_MB * 1024 * 1024)) {
    return { files: actuales, error: `Cada imagen debe pesar menos de ${MAX_TAMANO_MB}MB.` };
  }
  return { files: [...actuales, ...nuevas].slice(0, MAX_IMAGENES), error: null };
}

// Ctrl+V de un screenshot copiado, por ejemplo — el portapapeles trae el
// archivo como "item" en vez de como texto.
export function extraerImagenesDePortapapeles(event: React.ClipboardEvent): File[] {
  const items = event.clipboardData?.items;
  if (!items) return [];
  const archivos: File[] = [];
  for (const item of Array.from(items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) archivos.push(file);
    }
  }
  return archivos;
}

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
  const [dragOver, setDragOver] = useState(false);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  function agregar(nuevas: File[]) {
    if (nuevas.length === 0) return;
    const resultado = agregarImagenes(files, nuevas);
    setError(resultado.error);
    onChange(resultado.files);
  }

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const nuevos = Array.from(event.target.files ?? []);
    event.target.value = "";
    agregar(nuevos);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    agregar(Array.from(event.dataTransfer.files ?? []));
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const imagenes = extraerImagenesDePortapapeles(event);
    if (imagenes.length > 0) {
      event.preventDefault();
      agregar(imagenes);
    }
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
        <div
          tabIndex={0}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onPaste={handlePaste}
          style={{
            border: `2px dashed ${dragOver ? "#2563eb" : "#ccc"}`,
            borderRadius: 8,
            padding: 10,
            textAlign: "center",
            background: dragOver ? "rgba(37,99,235,0.06)" : "transparent",
          }}
        >
          <p className="muted" style={{ margin: "0 0 6px", fontSize: 12 }}>
            Arrastrá imágenes acá o pegá con Ctrl+V
          </p>
          <input type="file" accept="image/*" multiple onChange={handlePick} />
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
