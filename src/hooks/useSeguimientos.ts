import { useCallback, useEffect, useState } from "react";
import { getSeguimientos } from "../services/tareas";
import type { Seguimiento } from "../types/postventaCliente";

// "enabled" en vez de fetch inmediato siempre — ClienteFicha/TareasTab.tsx
// lo usa con un acordeon (expanded) para no traer seguimientos de tareas que
// nadie desplegó todavía; Tareas.tsx (drawer de detalle) lo llama con
// enabled=true directo, ya que ahí la tarea ya esta explícitamente abierta.
export function useSeguimientos(tareaId: number, enabled: boolean) {
  const [data, setData] = useState<Seguimiento[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    getSeguimientos(tareaId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareaId, enabled]);

  useEffect(() => {
    return load();
  }, [load]);

  return { data, loading, refetch: load };
}
