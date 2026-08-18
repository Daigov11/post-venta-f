import { getFichaCliente } from "../services/clientes";
import { useAsyncData } from "./useAsyncData";

export function useCliente(numeroDocumentoCliente: string) {
  return useAsyncData(() => getFichaCliente(numeroDocumentoCliente), [numeroDocumentoCliente]);
}
