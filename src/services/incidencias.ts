import { apiClient } from "./client";
import type { IncidenciasResponse, TipoIncidenciaCatalogo } from "../types/postventaCliente";

export async function getIncidencias(numeroDocumentoCliente: string): Promise<IncidenciasResponse> {
  const { data } = await apiClient.get<IncidenciasResponse>("/incidencias", {
    params: { numeroDocumentoCliente },
  });
  return data;
}

export async function getTiposIncidencia(): Promise<{ data: TipoIncidenciaCatalogo[] }> {
  const { data } = await apiClient.get("/incidencias/tipos");
  return data;
}

export async function crearIncidencia(input: {
  numeroDocumentoCliente: string;
  titulo: string;
  descripcion: string;
  tipo: number;
}): Promise<{ numero: string | null; message: string }> {
  const { data } = await apiClient.post("/incidencias", input);
  return data;
}
