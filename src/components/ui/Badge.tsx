import type { ReactNode } from "react";
import "./ui.css";

export type BadgeTone = "success" | "warning" | "critical" | "info" | "neutral" | "primary";

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
