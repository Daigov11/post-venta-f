import { getResultadoHoy } from "../services/resultadoDia";
import { useAsyncData } from "./useAsyncData";

export function useResultadoHoy() {
  return useAsyncData(() => getResultadoHoy(), []);
}
