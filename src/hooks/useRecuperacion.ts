import { getRecuperacion, type RecuperacionQueryParams } from "../services/recuperacion";
import { useAsyncData } from "./useAsyncData";

export function useRecuperacion(params: RecuperacionQueryParams = {}) {
  return useAsyncData(() => getRecuperacion(params), [JSON.stringify(params)]);
}
