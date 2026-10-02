import { getCarteraMensual } from "../services/tareas";
import { useAsyncData } from "./useAsyncData";

export function useCarteraMensual(refreshToken: number = 0) {
  return useAsyncData(() => getCarteraMensual(), [refreshToken]);
}
