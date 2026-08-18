import { apiClient } from "./client";
import type { EstadoReunion, ModalidadReunion, Reunion } from "../types/postventaCliente";

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
  fecha: string;
  horaInicio: string;
  modalidad: ModalidadReunion;
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
