import { getNotas } from "../services/notas";
import { useAsyncData } from "./useAsyncData";

export function useNotas(numeroDocumentoCliente: string) {
  return useAsyncData(() => getNotas(numeroDocumentoCliente), [numeroDocumentoCliente]);
}
