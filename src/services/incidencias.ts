import { apiClient } from "./client";
import type { IncidenciasResponse } from "../types/postventaCliente";

export async function getIncidencias(numeroDocumentoCliente: string): Promise<IncidenciasResponse> {
  const { data } = await apiClient.get<IncidenciasResponse>("/incidencias", {
    params: { numeroDocumentoCliente },
  });
  return data;
}
