import { apiClient } from "./client";
import type { Capacitacion } from "../types/postventaCliente";

export async function getCapacitaciones(numeroDocumentoCliente: string): Promise<Capacitacion[]> {
  const { data } = await apiClient.get<{ data: Capacitacion[] }>("/capacitaciones", {
    params: { numeroDocumentoCliente },
  });
  return data.data;
}
