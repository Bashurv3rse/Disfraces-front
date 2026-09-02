import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/AuthContext";

export function ProtectedRoute({ children, rolesPermitidos }: { children: ReactNode; rolesPermitidos?: string[] }) {
  const { usuario } = useAuth();

  if (!usuario) return <Navigate to="/login" replace />;
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) return <Navigate to="/catalogo" replace />;

  return <>{children}</>;
}
