import { apiClient } from "./client";
import type { Adjunto, EntidadAdjunto } from "../types/postventaCliente";

// Los adjuntos se sirven desde /uploads, fuera de /api — mismo origen que el
// backend, pero apiClient.baseURL ya incluye el sufijo /api.
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api").replace(
  /\/api\/?$/,
  ""
);

export function adjuntoUrl(adjunto: Adjunto): string {
  return `${API_ORIGIN}${adjunto.url}`;
}

export async function listAdjuntos(
  entidadTipo: EntidadAdjunto,
  entidadId: number
): Promise<Adjunto[]> {
  const { data } = await apiClient.get<{ data: Adjunto[] }>("/adjuntos", {
    params: { entidadTipo, entidadId },
  });
  return data.data;
}

// Version bulk — una sola request para varios items (lista de notas,
// seguimientos, etc.) en vez de una por cada uno.
export async function listAdjuntosBulk(
  entidadTipo: EntidadAdjunto,
  entidadIds: number[]
): Promise<Record<number, Adjunto[]>> {
  if (entidadIds.length === 0) return {};
  const { data } = await apiClient.get<{ data: Record<number, Adjunto[]> }>("/adjuntos", {
    params: { entidadTipo, entidadIds: entidadIds.join(",") },
  });
  return data.data;
}

export async function uploadAdjunto(
  entidadTipo: EntidadAdjunto,
  entidadId: number,
  file: File
): Promise<Adjunto> {
  const form = new FormData();
  form.append("entidadTipo", entidadTipo);
  form.append("entidadId", String(entidadId));
  form.append("file", file);
  // Sin header Content-Type explicito a proposito — el browser/axios arma
  // el boundary del multipart solo; forzarlo a mano rompe el parseo en el
  // backend (multer no encuentra el boundary).
  const { data } = await apiClient.post<Adjunto>("/adjuntos", form);
  return data;
}

export async function uploadAdjuntos(
  entidadTipo: EntidadAdjunto,
  entidadId: number,
  files: File[]
): Promise<Adjunto[]> {
  const resultados: Adjunto[] = [];
  for (const file of files) {
    resultados.push(await uploadAdjunto(entidadTipo, entidadId, file));
  }
  return resultados;
}

export async function deleteAdjunto(id: number): Promise<void> {
  await apiClient.delete(`/adjuntos/${id}`);
}
