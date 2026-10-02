import { getResumenHoy } from "../services/eventosOperativos";
import { useAsyncData } from "./useAsyncData";

export function useResumenEventosHoy(refreshToken: number = 0) {
  return useAsyncData(() => getResumenHoy(), [refreshToken]);
}
