import { apiClient } from "./client";
import type {
  EstadoReunion,
  ModalidadReunion,
  Reunion,
  ReunionConCliente,
} from "../types/postventaCliente";

export async function getDisponibilidad(params: {
  ejecutivo: string;
  fecha: string;
  modalidad: ModalidadReunion;
}): Promise<string[]> {
  const { data } = await apiClient.get<{ slots: string[] }>("/reuniones/disponibilidad", {
    params,
  });
  return data.slots;
}

export async function getReunionesCliente(numeroDocumentoCliente: string): Promise<Reunion[]> {
  const { data } = await apiClient.get<{ data: Reunion[] }>("/reuniones", {
    params: { numeroDocumentoCliente },
  });
  return data.data;
}

export async function createReunion(input: {
  numeroDocumentoCliente: string;
  idOrdenServicio?: number | null;
  ejecutivo: string;
  // Ausentes -> reunion especial "en espera", sin horario todavia (ver
  // tipoReunion/nota para el motivo y el comentario de disponibilidad).
  fecha?: string | null;
  horaInicio?: string | null;
  modalidad: ModalidadReunion;
  tipoReunion?: string | null;
  lugarOLink?: string | null;
  nota?: string | null;
}): Promise<Reunion> {
  const { data } = await apiClient.post<Reunion>("/reuniones", input);
  return data;
}

export async function updateReunionEstado(id: number, estado: EstadoReunion): Promise<Reunion> {
  const { data } = await apiClient.patch<Reunion>(`/reuniones/${id}`, { estado });
  return data;
}

// Le asigna horario real a una reunion EN_ESPERA (o reprograma una ya
// PROGRAMADA) — pasa por la misma validacion de disponibilidad que crear.
export async function asignarHorarioReunion(
  id: number,
  input: { fecha: string; horaInicio: string }
): Promise<Reunion> {
  const { data } = await apiClient.patch<Reunion>(`/reuniones/${id}/horario`, input);
  return data;
}

export async function getReuniones(params: {
  estado?: EstadoReunion;
  tipoReunion?: string;
}): Promise<{ data: ReunionConCliente[]; total: number }> {
  const { data } = await apiClient.get<{ data: ReunionConCliente[]; total: number }>(
    "/reuniones",
    { params }
  );
  return data;
}
