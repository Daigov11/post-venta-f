import type { ReactNode } from "react";
import "./ui.css";

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="card filter-bar">{children}</div>;
}
