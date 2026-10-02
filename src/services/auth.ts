import { apiClient } from "./client";

export type RolUsuario = "ADMIN" | "ADMINISTRATIVO" | "POSTVENTA";

export interface LoginPayload {
  usuario: string;
  password: string;
}

export interface LoginResponse {
  usuario: string;
  rol: RolUsuario;
  [key: string]: unknown;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", payload);
  return data;
}

export interface SessionInfo {
  authenticated: boolean;
  rol?: RolUsuario;
}

export async function checkSession(): Promise<SessionInfo> {
  try {
    const { data } = await apiClient.get<SessionInfo>("/auth/me");
    return data;
  } catch {
    return { authenticated: false };
  }
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
