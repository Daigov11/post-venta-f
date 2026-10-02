import { apiClient } from "./client";
import type { EstadoOportunidad, Oportunidad } from "../types/postventaCliente";

export interface OportunidadesQueryParams {
  tipo?: string;
  numeroDocumentoCliente?: string;
  estado?: EstadoOportunidad;
}

export async function getOportunidades(
  params: OportunidadesQueryParams = {}
): Promise<{ data: Oportunidad[]; generatedAt: string }> {
  const { data } = await apiClient.get<{ data: Oportunidad[]; generatedAt: string }>(
    "/oportunidades",
    { params }
  );
  return data;
}

export interface OportunidadEstadoInput {
  numeroDocumentoCliente: string;
  estado: EstadoOportunidad;
  responsable: string | null;
  siguienteAccion: string | null;
  resultado: string | null;
  // Solo tienen efecto junto a estado="GANADA" (ver "La Bolsa") — tipo es
  // Oportunidad.tipo tal cual. montoDeclarado (antes "montoReal") es
  // valorEstimado cuando ya es un numero real, o lo que la persona escriba
  // a mano si el motor no trae uno — nunca una cifra de caja verificada.
  tipo?: string;
  montoDeclarado?: number | null;
}

export async function updateOportunidadEstado(id: string, input: OportunidadEstadoInput) {
  const { data } = await apiClient.put(`/oportunidades/${encodeURIComponent(id)}/estado`, input);
  return data;
}
