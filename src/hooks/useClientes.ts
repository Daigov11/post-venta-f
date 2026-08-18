import { getClientes, type ClientesQueryParams } from "../services/clientes";
import { useAsyncData } from "./useAsyncData";

export function useClientes(params: ClientesQueryParams) {
  return useAsyncData(() => getClientes(params), [JSON.stringify(params)]);
}
