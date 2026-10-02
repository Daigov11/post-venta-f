import { apiClient } from "./client";
import type { BolsaEstado, TipoBolsaConversion } from "../types/postventaCliente";

export async function getMiBolsa(): Promise<BolsaEstado> {
  const { data } = await apiClient.get<BolsaEstado>("/bolsa");
  return data;
}

export async function cerrarBolsa(observacion: string | null): Promise<BolsaEstado> {
  const { data } = await apiClient.post<BolsaEstado>("/bolsa/cerrar", { observacion });
  return data;
}

export async function reabrirBolsa(): Promise<BolsaEstado> {
  const { data } = await apiClient.post<BolsaEstado>("/bolsa/reabrir");
  return data;
}

export async function registrarConversionBolsa(input: {
  tipo: TipoBolsaConversion;
  descripcion: string | null;
}): Promise<BolsaEstado> {
  const { data } = await apiClient.post<BolsaEstado>("/bolsa/conversiones", input);
  return data;
}
