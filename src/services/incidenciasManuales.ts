import { apiClient } from "./client";
import type { IncidenciaManual } from "../types/postventaCliente";

export async function getIncidenciasManuales(
  numeroDocumentoCliente: string
): Promise<IncidenciaManual[]> {
  const { data } = await apiClient.get<{ data: IncidenciaManual[] }>("/incidencias-manuales", {
    params: { numeroDocumentoCliente },
  });
  return data.data;
}

export async function createIncidenciaManual(input: {
  numeroDocumentoCliente: string;
  idOrdenServicio?: number | null;
  caso: string;
  tipo?: string | null;
  descripcion?: string | null;
}): Promise<IncidenciaManual> {
  const { data } = await apiClient.post<IncidenciaManual>("/incidencias-manuales", input);
  return data;
}
