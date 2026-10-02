import { getEventos, type EventosQueryParams } from "../services/eventosOperativos";
import { useAsyncData } from "./useAsyncData";

export function useEventosOperativos(params: EventosQueryParams, refreshToken: number = 0) {
  return useAsyncData(() => getEventos(params), [JSON.stringify(params), refreshToken]);
}
