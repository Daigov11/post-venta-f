import { apiClient } from "./client";
import type { CanalContacto, Contacto } from "../types/postventaCliente";

export async function createContacto(input: {
  numeroDocumentoCliente: string;
  idOrdenServicio?: number | null;
  canal: CanalContacto;
}): Promise<Contacto> {
  const { data } = await apiClient.post<Contacto>("/contactos", input);
  return data;
}
