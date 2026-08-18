import { getSavedViews } from "../services/savedViews";
import { useAsyncData } from "./useAsyncData";

export function useSavedViews(screen: string) {
  return useAsyncData(() => getSavedViews(screen), [screen]);
}
