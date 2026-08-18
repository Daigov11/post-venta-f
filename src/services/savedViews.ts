import { apiClient } from "./client";
import type { SavedView } from "../types/postventaCliente";

export async function getSavedViews(screen: string): Promise<SavedView[]> {
  const { data } = await apiClient.get<{ data: SavedView[] }>("/saved-views", {
    params: { screen },
  });
  return data.data;
}

export async function createSavedView(input: {
  screen: string;
  nombre: string;
  columnas: string[];
  filtros: Record<string, unknown>;
}): Promise<SavedView> {
  const { data } = await apiClient.post<SavedView>("/saved-views", input);
  return data;
}

export async function updateSavedView(
  id: number,
  patch: Partial<{ nombre: string; columnas: string[]; filtros: Record<string, unknown> }>
): Promise<SavedView> {
  const { data } = await apiClient.patch<SavedView>(`/saved-views/${id}`, patch);
  return data;
}

export async function deleteSavedView(id: number): Promise<void> {
  await apiClient.delete(`/saved-views/${id}`);
}
