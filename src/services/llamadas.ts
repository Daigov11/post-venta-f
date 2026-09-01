import { apiClient } from "./client";
import type { Llamada } from "../types/postventaCliente";

export async function createLlamada(input: {
  numeroDocumentoCliente: string;
  idOrdenServicio?: number | null;
}): Promise<Llamada> {
  const { data } = await apiClient.post<Llamada>("/llamadas", input);
  return data;
}
