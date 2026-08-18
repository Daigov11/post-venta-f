import { apiClient } from "./client";

export interface LoginPayload {
  usuario: string;
  password: string;
}

export interface LoginResponse {
  usuario: string;
  [key: string]: unknown;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", payload);
  return data;
}

export async function checkSession(): Promise<boolean> {
  try {
    const { data } = await apiClient.get<{ authenticated: boolean }>("/auth/me");
    return data.authenticated;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
