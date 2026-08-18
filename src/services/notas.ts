import { apiClient } from "./client";
import type { Nota } from "../types/postventaCliente";

export async function getNotas(numeroDocumentoCliente: string): Promise<Nota[]> {
  const { data } = await apiClient.get<{ data: Nota[] }>("/notas", {
    params: { numeroDocumentoCliente },
  });
  return data.data;
}

export async function createNota(input: {
  numeroDocumentoCliente: string;
  idOrdenServicio?: number | null;
  nota: string;
}): Promise<Nota> {
  const { data } = await apiClient.post<Nota>("/notas", input);
  return data;
}

export async function updateNota(id: number, nota: string): Promise<Nota> {
  const { data } = await apiClient.patch<Nota>(`/notas/${id}`, { nota });
  return data;
}

export async function deleteNota(id: number): Promise<void> {
  await apiClient.delete(`/notas/${id}`);
}
