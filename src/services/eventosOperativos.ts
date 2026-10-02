import { apiClient } from "./client";
import type {
  EventoOperativo,
  ResumenEventosOperativos,
  TipoAccionOperativa,
} from "../types/postventaCliente";

export async function getResumenHoy(): Promise<ResumenEventosOperativos> {
  const { data } = await apiClient.get<ResumenEventosOperativos>("/eventos-operativos/resumen-hoy");
  return data;
}

export interface ResumenRangoParams {
  usuario?: string;
  desde?: string;
  hasta?: string;
}

export async function getResumenRango(
  params: ResumenRangoParams = {}
): Promise<{ data: ResumenEventosOperativos[] }> {
  const { data } = await apiClient.get("/eventos-operativos/resumen", { params });
  return data;
}

export interface EventosQueryParams {
  usuario?: string;
  numeroDocumentoCliente?: string;
  entidadTipo?: string;
  entidadId?: string;
  tipoAccion?: TipoAccionOperativa;
  desde?: string;
  hasta?: string;
  limit?: number;
}

export async function getEventos(
  params: EventosQueryParams = {}
): Promise<{ data: EventoOperativo[] }> {
  const { data } = await apiClient.get("/eventos-operativos", { params });
  return data;
}
