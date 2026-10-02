import { listUsuariosAutorizados } from "../services/usuariosAutorizados";
import { useAsyncData } from "./useAsyncData";

export function useUsuariosAutorizados() {
  return useAsyncData(() => listUsuariosAutorizados(), []);
}
