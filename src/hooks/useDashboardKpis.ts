import { getDashboardKpis } from "../services/dashboard";
import { useAsyncData } from "./useAsyncData";

export function useDashboardKpis() {
  return useAsyncData(() => getDashboardKpis(), []);
}
