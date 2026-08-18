import { getSeguimientos } from "../services/tareas";
import { useAsyncData } from "./useAsyncData";

export function useSeguimientos(tareaId: number, enabled = true) {
  return useAsyncData(
    () => (enabled ? getSeguimientos(tareaId) : Promise.resolve([])),
    [tareaId, enabled]
  );
}
