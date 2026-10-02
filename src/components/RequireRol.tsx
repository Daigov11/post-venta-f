import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import type { RolUsuario } from "../services/auth";
import { AccessDenied } from "./AccessDenied";

export function RequireRol({
  roles,
  children,
}: {
  roles: RolUsuario[];
  children: ReactNode;
}) {
  const { rol } = useAuth();
  if (!rol || !roles.includes(rol)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}
