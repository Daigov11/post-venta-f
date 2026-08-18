import { apiClient } from "./client";
import type { Alerta, NivelAlerta } from "../types/postventaCliente";

export interface AlertasQueryParams {
  nivel?: NivelAlerta;
  tipo?: string;
  numeroDocumentoCliente?: string;
}

export async function getAlertas(
  params: AlertasQueryParams = {}
): Promise<{ data: Alerta[]; generatedAt: string }> {
  const { data } = await apiClient.get<{ data: Alerta[]; generatedAt: string }>("/alertas", {
    params,
  });
  return data;
}
