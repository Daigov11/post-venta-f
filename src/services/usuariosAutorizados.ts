import { apiClient } from "./client";
import type { RolUsuario } from "./auth";

export interface UsuarioAutorizado {
  id: number;
  idUsuarioApiworking: string | null;
  usuarioExterno: string;
  nombreVisible: string;
  rol: RolUsuario;
  activo: boolean;
  recibeReparto: boolean;
  ultimoAccesoEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
  creadoPor: string;
  actualizadoPor: string | null;
}

export interface CrearUsuarioAutorizadoInput {
  usuarioExterno: string;
  idUsuarioApiworking?: string;
  nombreVisible: string;
  rol: RolUsuario;
  activo?: boolean;
}

export interface ActualizarUsuarioAutorizadoInput {
  nombreVisible?: string;
  rol?: RolUsuario;
  activo?: boolean;
  recibeReparto?: boolean;
  idUsuarioApiworking?: string;
}

export async function listUsuariosAutorizados(): Promise<UsuarioAutorizado[]> {
  const { data } = await apiClient.get<{ data: UsuarioAutorizado[] }>("/usuarios-autorizados");
  return data.data;
}

export async function crearUsuarioAutorizado(
  input: CrearUsuarioAutorizadoInput
): Promise<UsuarioAutorizado> {
  const { data } = await apiClient.post<UsuarioAutorizado>("/usuarios-autorizados", input);
  return data;
}

export async function actualizarUsuarioAutorizado(
  id: number,
  patch: ActualizarUsuarioAutorizadoInput
): Promise<UsuarioAutorizado> {
  const { data } = await apiClient.patch<UsuarioAutorizado>(`/usuarios-autorizados/${id}`, patch);
  return data;
}
