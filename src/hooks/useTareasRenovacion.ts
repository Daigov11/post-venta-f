import { getTareasRenovacion } from "../services/tareas";
import { useAsyncData } from "./useAsyncData";

export function useTareasRenovacion() {
  return useAsyncData(() => getTareasRenovacion(), []);
}
