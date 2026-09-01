import { apiClient } from "./client";
import type { Alerta, EstadoAlerta, NivelAlerta } from "../types/postventaCliente";

export interface AlertasQueryParams {
  nivel?: NivelAlerta;
  tipo?: string;
  numeroDocumentoCliente?: string;
  estado?: EstadoAlerta;
}

export async function getAlertas(
  params: AlertasQueryParams = {}
): Promise<{ data: Alerta[]; generatedAt: string }> {
  const { data } = await apiClient.get<{ data: Alerta[]; generatedAt: string }>("/alertas", {
    params,
  });
  return data;
}

export async function marcarEstadoAlerta(
  id: string,
  numeroDocumentoCliente: string,
  estado: "VISTA" | "RESUELTA",
  nota?: string
): Promise<void> {
  await apiClient.put(`/alertas/${encodeURIComponent(id)}/estado`, {
    numeroDocumentoCliente,
    estado,
    nota,
  });
}

export async function reabrirAlerta(id: string): Promise<void> {
  await apiClient.delete(`/alertas/${encodeURIComponent(id)}/estado`);
}
