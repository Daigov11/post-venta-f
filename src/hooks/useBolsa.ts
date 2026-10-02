import { getMiBolsa } from "../services/bolsa";
import { useAsyncData } from "./useAsyncData";

export function useBolsa(refreshToken: number = 0) {
  return useAsyncData(() => getMiBolsa(), [refreshToken]);
}
