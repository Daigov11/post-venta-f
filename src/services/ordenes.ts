import { apiClient } from "./client";

export interface OrdenServicioFilters {
  fechaInicio: string;
  fechaFin: string;
  plan?: string;
  estado?: string;
  allFechas?: number;
  displayStart?: number;
  displayLength?: number;
  search?: string;
}

export async function getOrdenesServicio(filters: OrdenServicioFilters) {
  const { data } = await apiClient.get("/ordenes/servicio", { params: filters });
  return data;
}
