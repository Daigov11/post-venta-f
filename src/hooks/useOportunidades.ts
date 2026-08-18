import { getOportunidades, type OportunidadesQueryParams } from "../services/oportunidades";
import { useAsyncData } from "./useAsyncData";

export function useOportunidades(params: OportunidadesQueryParams = {}) {
  return useAsyncData(() => getOportunidades(params), [JSON.stringify(params)]);
}
