import { getConfig } from "../services/config";
import { useAsyncData } from "./useAsyncData";

export function useConfig() {
  return useAsyncData(() => getConfig(), []);
}
