import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "CLIENTE" | "ADMINISTRADOR" | "PROVEEDOR";
}

interface AuthContextValue {
  usuario: Usuario | null;
  guardarSesion: (usuario: Usuario, accessToken: string, refreshToken: string) => void;
  cerrarSesion: () => void;
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

  function cerrarSesion() {
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