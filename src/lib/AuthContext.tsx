import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "CLIENTE" | "ADMINISTRADOR" | "PROVEEDOR";
}

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  guardarSesion: (usuario: Usuario, token: string) => void;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  const guardarSesion = useCallback((usuario: Usuario, token: string) => {
    localStorage.setItem("usuario", JSON.stringify(usuario));
    localStorage.setItem("token", token);
    setUsuario(usuario);
    setToken(token);
  }, []);

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    setUsuario(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, token, guardarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
