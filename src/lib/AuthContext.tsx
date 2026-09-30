import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { api } from "./api";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "CLIENTE" | "ADMINISTRADOR" | "PROVEEDOR";
}

interface AuthContextValue {
  usuario: Usuario | null;
  guardarSesion: (usuario: Usuario, accessToken: string, refreshToken: string) => void;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function leerUsuarioGuardado(): Usuario | null {
  const crudo = localStorage.getItem("usuario");
  if (!crudo) return null;
  try {
    return JSON.parse(crudo);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(leerUsuarioGuardado);

  function guardarSesion(usuario: Usuario, accessToken: string, refreshToken: string) {
    localStorage.setItem("usuario", JSON.stringify(usuario));
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setUsuario(usuario);
  }

  async function cerrarSesion() {
    try {
      // Revoca TODAS las sesiones del usuario en el servidor (todos los
      // dispositivos), no solo esta pestaña.
      await api.post("/auth/logout");
    } catch {
      // Si falla (ej. el token ya expiró), igual limpiamos la sesión local.
    }
    localStorage.removeItem("usuario");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, guardarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}