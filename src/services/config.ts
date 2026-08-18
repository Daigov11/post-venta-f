import { apiClient } from "./client";
import type { PostVentaConfigValues } from "../types/postventaCliente";

export async function getConfig(): Promise<PostVentaConfigValues> {
  const { data } = await apiClient.get<PostVentaConfigValues>("/config");
  return data;
}

export async function updateConfig(
  patch: Partial<Record<keyof PostVentaConfigValues, string>>
): Promise<PostVentaConfigValues> {
  const { data } = await apiClient.patch<PostVentaConfigValues>("/config", patch);
  return data;
}
