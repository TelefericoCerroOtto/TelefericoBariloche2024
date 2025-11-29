import { AppAlertContext } from "@/components/shared/AppAlertProvider";
import { useContext } from "react";

export function useAppAlert() {
  const ctx = useContext(AppAlertContext);
  if (!ctx) {
    throw new Error("useAppAlert must be used within <AppAlertProvider />");
  }
  return ctx;
}
