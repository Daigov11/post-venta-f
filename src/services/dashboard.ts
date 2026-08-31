import { apiClient } from "./client";
import type { DashboardKpis } from "../types/postventaCliente";

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const { data } = await apiClient.get<DashboardKpis>("/dashboard/kpis");
  return data;
}

export async function refreshPostVentaCache(): Promise<{
  generatedAt: string;
  totalClientes: number;
  totalOsRows: number;
}> {
  const { data } = await apiClient.post("/postventa/refresh", undefined, { timeout: 0 });
  return data;
}
