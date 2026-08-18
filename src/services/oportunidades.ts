import { apiClient } from "./client";
import type { Oportunidad } from "../types/postventaCliente";

export interface OportunidadesQueryParams {
  tipo?: string;
  numeroDocumentoCliente?: string;
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
