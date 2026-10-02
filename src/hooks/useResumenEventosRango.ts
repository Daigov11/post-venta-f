import { getResumenRango, type ResumenRangoParams } from "../services/eventosOperativos";
import { useAsyncData } from "./useAsyncData";

// params === null significa "todavia no hay nada que consultar" (ej. drawer
// de detalle cerrado) — se resuelve a una lista vacia sin pegarle al backend.
export function useResumenEventosRango(params: ResumenRangoParams | null) {
  return useAsyncData(
    () => (params === null ? Promise.resolve({ data: [] }) : getResumenRango(params)),
    [JSON.stringify(params)]
  );
}
