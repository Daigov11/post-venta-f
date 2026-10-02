import { useState } from "react";
import { SeguimientoForm } from "../../components/forms/SeguimientoForm";
import { AdjuntosGaleria } from "../../components/ui/AdjuntosGaleria";
import { Skeleton } from "../../components/ui/Skeleton";
import { useSeguimientos } from "../../hooks/useSeguimientos";
import { uploadAdjuntos } from "../../services/adjuntos";
import { createSeguimiento } from "../../services/tareas";
import { ESTADO_TAREA_LABEL } from "../../utils/tareaLabels";

// Historial de comentarios de seguimiento de la tarea — mismo patron ya
// usado en ClienteFicha/TareasTab.tsx (SeguimientoForm + AdjuntosGaleria),
// solo que aca la tarea ya esta explicitamente abierta en el drawer, asi que
// se pide con enabled=true directo (sin acordeon). Distinto del "Historial
// de cambios" (eventos automaticos del sistema, ver useEventosOperativos):
// esto son notas que alguien del equipo escribe a mano.
export function SeguimientosSection({ tareaId }: { tareaId: number }) {
  const { data: seguimientos, loading, refetch } = useSeguimientos(tareaId, true);
  const [enviando, setEnviando] = useState(false);

  async function handleAddSeguimiento(comentario: string, imagenes: File[]) {
    setEnviando(true);
    try {
      const creado = await createSeguimiento(tareaId, comentario);
      if (imagenes.length > 0) {
        await uploadAdjuntos("TAREA_SEGUIMIENTO", creado.id, imagenes);
      }
      refetch();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="tarea-detalle-seccion">
      <h4>Historial de seguimiento</h4>
      {loading && <Skeleton height={60} />}
      {!loading && seguimientos && seguimientos.length === 0 && (
        <p className="muted">Sin comentarios de seguimiento todavía.</p>
      )}
      {!loading && seguimientos && seguimientos.length > 0 && (
        <ul className="tarea-detalle-historial">
          {seguimientos.map((s) => (
            <li key={s.id}>
              {s.comentario}
              <div className="muted">
                {s.usuario} · {new Date(s.createdAt).toLocaleString("es-PE")}
                {s.estadoEnEseMomento && <> · estado en ese momento: {ESTADO_TAREA_LABEL[s.estadoEnEseMomento]}</>}
              </div>
              <AdjuntosGaleria entidadTipo="TAREA_SEGUIMIENTO" entidadId={s.id} />
            </li>
          ))}
        </ul>
      )}
      <SeguimientoForm onSubmit={handleAddSeguimiento} submitting={enviando} />
    </section>
  );
}
