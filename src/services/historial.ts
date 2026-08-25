import { apiClient } from "./client";
import type { HistorialSeguimientoEvento } from "../types/postventaCliente";

export async function getHistorialSeguimiento(
  idOrdenServicio: number
): Promise<{ data: HistorialSeguimientoEvento[]; total: number }> {
  const { data } = await apiClient.get<{ data: HistorialSeguimientoEvento[]; total: number }>(
    "/historial-seguimiento",
    { params: { idOrdenServicio } }
  );
  return data;
}
