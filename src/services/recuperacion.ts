import { apiClient } from "./client";
import type {
  EpisodioRecuperacion,
  EstadoRecuperacion,
  OrigenRecuperacion,
  RecuperacionQueryResult,
} from "../types/postventaCliente";

export interface RecuperacionQueryParams {
  origen?: OrigenRecuperacion;
  responsable?: string;
  estado?: EstadoRecuperacion;
  cliente?: string;
  diasRestantesMax?: number;
  page?: number;
  pageSize?: number;
}

export async function getRecuperacion(
  params: RecuperacionQueryParams
): Promise<RecuperacionQueryResult> {
  const { data } = await apiClient.get<RecuperacionQueryResult>("/recuperacion", { params });
  return data;
}

export async function actualizarEpisodioRecuperacion(
  id: number,
  patch: Partial<{
    estado: EstadoRecuperacion;
    responsable: string;
    resultado: string;
    fechaIngreso: string;
  }>
): Promise<EpisodioRecuperacion> {
  const { data } = await apiClient.patch<EpisodioRecuperacion>(`/recuperacion/${id}`, patch);
  return data;
}
