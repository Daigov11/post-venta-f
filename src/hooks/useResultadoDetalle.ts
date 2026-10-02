import { getResultadoDetalle } from "../services/resultadoDia";
import type { ResultadoDia } from "../types/postventaCliente";
import { useAsyncData } from "./useAsyncData";

// id === null significa "ningun dia seleccionado todavia" (drawer cerrado) —
// se resuelve a null sin pegarle al backend en vez de condicionar el fetch
// por fuera del hook.
export function useResultadoDetalle(id: number | null) {
  return useAsyncData<ResultadoDia | null>(
    () => (id === null ? Promise.resolve(null) : getResultadoDetalle(id)),
    [id]
  );
}
