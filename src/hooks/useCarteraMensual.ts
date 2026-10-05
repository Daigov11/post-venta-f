import { getCarteraMensual } from "../services/tareas";
import { useAsyncData } from "./useAsyncData";

export function useCarteraMensual(alcance: "todas" | "mias", refreshToken: number = 0) {
  return useAsyncData(() => getCarteraMensual(alcance), [alcance, refreshToken]);
}
