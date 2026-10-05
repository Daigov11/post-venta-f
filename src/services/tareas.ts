import { apiClient } from "./client";
import type {
  EstadoTarea,
  OrigenTarea,
  PrioridadTarea,
  ResumenCarteraMensual,
  Seguimiento,
  Tarea,
  TareaCarteraMensual,
  TareaListItem,
  TareaRenovacion,
  TipoTarea,
} from "../types/postventaCliente";

export interface TareasQueryParams {
  numeroDocumentoCliente?: string;
  estado?: EstadoTarea;
  responsable?: string;
  tipo?: TipoTarea;
  origen?: OrigenTarea;
  prioridad?: PrioridadTarea;
  fechaDesde?: string;
  fechaHasta?: string;
  vencidas?: boolean;
}

export async function getTareas(params: TareasQueryParams = {}): Promise<TareaListItem[]> {
  const { data } = await apiClient.get<{ data: TareaListItem[] }>("/tareas", { params });
  return data.data;
}

// Auto-generadas por el sync compartido (clientes en ventana de renovacion,
// una tarea abierta a la vez por cliente) — se sincronizan al pedir esta
// lista, no hace falta refrescar manualmente.
export async function getTareasRenovacion(): Promise<TareaRenovacion[]> {
  const { data } = await apiClient.get<{ data: TareaRenovacion[] }>("/tareas/renovacion");
  return data.data;
}

// Reparto mensual de contactos — se genera/sincroniza al pedir esta lista
// (mismo patron que renovacion), pero NUNCA desde GET /tareas general (ver
// listTareas en el backend, ajustado por rendimiento).
//
// alcance="mias" limita a las tareas del propio usuario (un ADMIN que tambien
// recibe reparto); sin el, un ADMIN ve las de todos y el resto solo las suyas
// (lo decide el backend, no este parametro).
export async function getCarteraMensual(alcance: "todas" | "mias" = "todas"): Promise<{
  resumen: ResumenCarteraMensual;
  data: TareaCarteraMensual[];
}> {
  const { data } = await apiClient.get<{ resumen: ResumenCarteraMensual; data: TareaCarteraMensual[] }>(
    "/tareas/reparto-mensual",
    { params: alcance === "mias" ? { alcance } : undefined }
  );
  return data;
}

export async function reconstruirCarteraMensual(): Promise<{
  nuevas: number;
  replanificadas: number;
  canceladas: number;
}> {
  const { data } = await apiClient.post<{ nuevas: number; replanificadas: number; canceladas: number }>(
    "/tareas/reparto-mensual/reconstruir"
  );
  return data;
}

// Redistribucion explicita (nunca automatica) de las tareas de reparto
// mensual que quedaron vencidas sin contactar — mueve su fecha_vencimiento
// a los dias habiles que quedan del mes y registra un evento trazable por
// cada una (ver TAREA_POSTERGADA en Historial de cambios).
export async function redistribuirCarteraMensual(): Promise<{
  redistribuidas: number;
  sinDiasDisponibles: number;
}> {
  const { data } = await apiClient.post<{ redistribuidas: number; sinDiasDisponibles: number }>(
    "/tareas/reparto-mensual/redistribuir"
  );
  return data;
}

export async function getTarea(id: number): Promise<Tarea> {
  const { data } = await apiClient.get<Tarea>(`/tareas/${id}`);
  return data;
}

export async function createTarea(input: {
  numeroDocumentoCliente: string;
  idOrdenServicio?: number | null;
  tipo?: TipoTarea;
  origen?: OrigenTarea;
  origenEntidadTipo?: string | null;
  origenEntidadId?: string | null;
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
