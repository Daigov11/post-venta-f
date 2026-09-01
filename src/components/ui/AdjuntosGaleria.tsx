import { useAsyncData } from "../../hooks/useAsyncData";
import { adjuntoUrl, listAdjuntos } from "../../services/adjuntos";
import type { EntidadAdjunto } from "../../types/postventaCliente";

export function AdjuntosGaleria({
  entidadTipo,
  entidadId,
}: {
  entidadTipo: EntidadAdjunto;
  entidadId: number;
}) {
  const { data } = useAsyncData(
    () => listAdjuntos(entidadTipo, entidadId),
    [entidadTipo, entidadId]
  );

  if (!data || data.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {data.map((adjunto) => (
        <a key={adjunto.id} href={adjuntoUrl(adjunto)} target="_blank" rel="noreferrer">
          <img
            src={adjuntoUrl(adjunto)}
            alt={adjunto.nombreOriginal}
            style={{
              width: 56,
              height: 56,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid #ddd",
            }}
          />
        </a>
      ))}
    </div>
  );
}
