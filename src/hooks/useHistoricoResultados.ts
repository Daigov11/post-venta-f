import { getHistorico, type HistoricoQueryParams } from "../services/resultadoDia";
import { useAsyncData } from "./useAsyncData";

// refreshToken no se manda al backend — solo fuerza un refetch cuando algo
// externo a los filtros cambia (ej. se cerro el dia de hoy en otra seccion
// de la misma pantalla).
export function useHistoricoResultados(params: HistoricoQueryParams = {}, refreshToken: number = 0) {
  return useAsyncData(() => getHistorico(params), [JSON.stringify(params), refreshToken]);
}
