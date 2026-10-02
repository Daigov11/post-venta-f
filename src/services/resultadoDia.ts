import { apiClient } from "./client";
import type {
  ResultadoAccion,
  ResultadoConversion,
  ResultadoDia,
  ResultadoDiaResumen,
  TipoConversion,
} from "../types/postventaCliente";

export async function getResultadoHoy(): Promise<{ resultado: ResultadoDia | null; fecha: string }> {
  const { data } = await apiClient.get("/resultados/hoy");
  return data;
}

export async function abrirDia(montoApertura: number): Promise<ResultadoDia> {
  const { data } = await apiClient.post<ResultadoDia>("/resultados/abrir", { montoApertura });
  return data;
}

export async function registrarAccion(
  resultadoDiaId: number,
  input: { tipo: string; realizadas: number; noRealizadas: number }
): Promise<ResultadoAccion> {
  const { data } = await apiClient.put<ResultadoAccion>(
    `/resultados/${resultadoDiaId}/acciones`,
    input
  );
  return data;
}

export async function eliminarAccion(resultadoDiaId: number, tipo: string): Promise<void> {
  await apiClient.delete(`/resultados/${resultadoDiaId}/acciones/${encodeURIComponent(tipo)}`);
}

export async function registrarConversion(
  resultadoDiaId: number,
  input: { tipo: TipoConversion; cantidad: number; detalle: string | null }
): Promise<ResultadoConversion> {
  const { data } = await apiClient.put<ResultadoConversion>(
    `/resultados/${resultadoDiaId}/conversiones`,
    input
  );
  return data;
}

export async function cerrarDia(
  resultadoDiaId: number,
  input: { observacionCierre: string | null; avisoAdministracion: boolean; motivoAviso: string | null }
): Promise<ResultadoDia> {
  const { data } = await apiClient.put<ResultadoDia>(`/resultados/${resultadoDiaId}/cerrar`, input);
  return data;
}

export async function getResultadoDetalle(id: number): Promise<ResultadoDia> {
  const { data } = await apiClient.get<ResultadoDia>(`/resultados/${id}`);
  return data;
}

export interface HistoricoQueryParams {
  usuario?: string;
  desde?: string;
  hasta?: string;
}

export async function getHistorico(
  params: HistoricoQueryParams = {}
): Promise<{ data: ResultadoDiaResumen[] }> {
  const { data } = await apiClient.get("/resultados/historico", { params });
  return data;
}
