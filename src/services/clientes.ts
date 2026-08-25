import { apiClient } from "./client";
import type {
  ClienteBajaResumen,
  ClientesBajaQueryResult,
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
  nEstadoApiWorkingRaw?: string;
  nuevoGranularidad?: "dia" | "semana" | "mes" | "anio";
  nuevoReferencia?: string;
  suspendidoGranularidad?: "dia" | "semana" | "mes" | "anio";
  suspendidoReferencia?: string;
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
  telefonoManual?: string | null;
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

// Clientes con nEstadoApiWorking = "CLIENTE DE BAJA" — excluidos del listado
// normal de /clientes, paginados aparte. La fechaBaja se calcula/cachea en el
// backend bajo demanda por pagina, puede tardar un poco la primera vez que se
// pide cada pagina.
export async function getClientesBaja(params: {
  page?: number;
  pageSize?: number;
  orden?: "reciente" | "antiguo";
  granularidad?: "dia" | "semana" | "mes" | "anio";
  referencia?: string;
}): Promise<ClientesBajaQueryResult> {
  const { data } = await apiClient.get<ClientesBajaQueryResult>("/clientes-baja", { params });
  return data;
}

export type { ClienteBajaResumen };
