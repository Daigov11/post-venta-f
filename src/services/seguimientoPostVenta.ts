import { apiClient } from "./client";
import type { SeguimientoDetalle, SeguimientoResumen } from "../types/postventaCliente";

export async function getSeguimientoPostVenta(): Promise<{
  data: SeguimientoResumen[];
  total: number;
}> {
  const { data } = await apiClient.get<{ data: SeguimientoResumen[]; total: number }>(
    "/seguimiento-postventa"
  );
  return data;
}

export async function getSeguimientoDetalle(
  numeroDocumentoCliente: string
): Promise<SeguimientoDetalle> {
  const { data } = await apiClient.get<SeguimientoDetalle>(
    `/seguimiento-postventa/${numeroDocumentoCliente}`
  );
  return data;
}

export async function upsertSeguimientoEtapa(
  numeroDocumentoCliente: string,
  etapa: 1 | 2 | 3,
  input: {
    fechaRealizado: string | null;
    medioComunicacion: string | null;
    estadoSeguimiento: string | null;
    resumen: string | null;
    solicitudCliente: string | null;
  }
): Promise<void> {
  await apiClient.post(`/seguimiento-postventa/${numeroDocumentoCliente}/etapas/${etapa}`, input);
}
