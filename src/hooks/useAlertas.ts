import { getAlertas, type AlertasQueryParams } from "../services/alertas";
import { useAsyncData } from "./useAsyncData";

export function useAlertas(params: AlertasQueryParams = {}) {
  return useAsyncData(() => getAlertas(params), [JSON.stringify(params)]);
}
