import { apiClient } from "./client";
import type { EstadoTarea, PrioridadTarea, Seguimiento, Tarea } from "../types/postventaCliente";

export interface TareasQueryParams {
  numeroDocumentoCliente?: string;
  estado?: EstadoTarea;
  responsable?: string;
  vencidas?: boolean;
}

export async function getTareas(params: TareasQueryParams = {}): Promise<Tarea[]> {
  const { data } = await apiClient.get<{ data: Tarea[] }>("/tareas", { params });
  return data.data;
}

export async function getTarea(id: number): Promise<Tarea> {
  const { data } = await apiClient.get<Tarea>(`/tareas/${id}`);
  return data;
}

export async function createTarea(input: {
  numeroDocumentoCliente: string;
  idOrdenServicio?: number | null;
  titulo: string;
  descripcion?: string | null;
  responsable: string;
  prioridad?: PrioridadTarea;
  fechaVencimiento?: string | null;
}): Promise<Tarea> {
  const { data } = await apiClient.post<Tarea>("/tareas", input);
  return data;
}

export async function updateTarea(
  id: number,
  patch: Partial<{
    titulo: string;
    descripcion: string | null;
    responsable: string;
    prioridad: PrioridadTarea;
    estado: EstadoTarea;
    fechaVencimiento: string | null;
  }>
): Promise<Tarea> {
  const { data } = await apiClient.patch<Tarea>(`/tareas/${id}`, patch);
  return data;
}

export async function deleteTarea(id: number): Promise<void> {
  await apiClient.delete(`/tareas/${id}`);
}

export async function getSeguimientos(tareaId: number): Promise<Seguimiento[]> {
  const { data } = await apiClient.get<{ data: Seguimiento[] }>(
    `/tareas/${tareaId}/seguimientos`
  );
  return data.data;
}

export async function createSeguimiento(
  tareaId: number,
  comentario: string
): Promise<Seguimiento> {
  const { data } = await apiClient.post<Seguimiento>(`/tareas/${tareaId}/seguimientos`, {
    comentario,
  });
  return data;
}
