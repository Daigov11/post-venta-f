import { apiClient } from "./client";
import type { InteresCatalogo } from "../types/postventaCliente";

export async function getCatalogoIntereses(): Promise<InteresCatalogo[]> {
  const { data } = await apiClient.get<{ data: InteresCatalogo[] }>("/intereses");
  return data.data;
}

export async function createInteres(input: {
  icono?: string | null;
  nombre: string;
  descripcion?: string | null;
  etiqueta?: string | null;
}): Promise<InteresCatalogo> {
  const { data } = await apiClient.post<InteresCatalogo>("/intereses", input);
  return data;
}

export async function getClienteIntereses(
  numeroDocumentoCliente: string
): Promise<{ catalogo: InteresCatalogo[]; marcados: number[] }> {
  const { data } = await apiClient.get<{ catalogo: InteresCatalogo[]; marcados: number[] }>(
    `/clientes/${numeroDocumentoCliente}/intereses`
  );
  return data;
}

export async function setClienteIntereses(
  numeroDocumentoCliente: string,
  interesIds: number[]
): Promise<number[]> {
  const { data } = await apiClient.put<{ marcados: number[] }>(
    `/clientes/${numeroDocumentoCliente}/intereses`,
    { interesIds }
  );
  return data.marcados;
}
