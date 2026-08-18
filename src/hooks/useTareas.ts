import { getTareas, type TareasQueryParams } from "../services/tareas";
import { useAsyncData } from "./useAsyncData";

export function useTareas(params: TareasQueryParams = {}) {
  return useAsyncData(() => getTareas(params), [JSON.stringify(params)]);
}
