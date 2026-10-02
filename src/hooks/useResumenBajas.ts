import { getResumenBajas } from "../services/clientes";
import { useAsyncData } from "./useAsyncData";

export function useResumenBajas() {
  return useAsyncData(() => getResumenBajas(), []);
}
