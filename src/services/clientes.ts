import { apiClient } from "./client";
import type {
  ClientesQueryResult,
  EstadoPostVenta,
  FichaClienteResponse,
  SystemUsersCache,
} from "../types/postventaCliente";

export interface ClientesQueryParams {
  search?: string;
  estado?: string;
  plan?: string;
  periodicidad?: string;
  ejecutivo?: string;
  tipoOS?: string;
  distribuidor?: string;
  conDeuda?: boolean;
  conEquipo?: boolean;
  documentacionCompleta?: boolean;
  departamento?: string;
  antiguedadMesesMin?: number;
  antiguedadMesesMax?: number;
  comprobantesMin?: number;
  comprobantesMax?: number;
  segmento?: string;
  renovacionProxima?: boolean;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getClientes(
  params: ClientesQueryParams
): Promise<ClientesQueryResult> {
  const { data } = await apiClient.get<ClientesQueryResult>("/clientes", { params });
  return data;
}

export async function getFichaCliente(
  numeroDocumentoCliente: string
): Promise<FichaClienteResponse> {
  const { data } = await apiClient.get<FichaClienteResponse>(
    `/clientes/${numeroDocumentoCliente}`
  );
  return data;
}

export interface ClienteMetadataPatch {
  segmentoManual?: string | null;
  estadoPostVentaManual?: EstadoPostVenta | null;
  etiquetas?: string[];
  observacionGeneral?: string | null;
}

export async function updateClienteMetadata(
  numeroDocumentoCliente: string,
  patch: ClienteMetadataPatch
): Promise<void> {
  await apiClient.patch(`/clientes/${numeroDocumentoCliente}/metadata`, patch);
}

export interface RefreshSystemUsersAllResult {
  totalClientes: number;
  exitosos: number;
  fallidos: number;
}

// Recorre TODA la cartera contra el sistema propio de cada cliente — puede
// tardar varios minutos, es una accion administrativa manual.
export async function refreshSystemUsersAll(): Promise<RefreshSystemUsersAllResult> {
  const { data } = await apiClient.post<RefreshSystemUsersAllResult>(
    "/clientes/system-users/refresh"
  );
  return data;
}

export async function refreshSystemUsersOne(
  numeroDocumentoCliente: string
): Promise<SystemUsersCache> {
  const { data } = await apiClient.post<SystemUsersCache>(
    `/clientes/${numeroDocumentoCliente}/system-users/refresh`
  );
  return data;
}
