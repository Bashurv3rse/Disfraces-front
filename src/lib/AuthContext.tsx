import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, establecerAccessToken } from "./api";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "CLIENTE" | "ADMINISTRADOR" | "PROVEEDOR";
}

interface AuthContextValue {
  usuario: Usuario | null;
  cargandoSesion: boolean;
  guardarSesion: (usuario: Usuario, accessToken: string) => void;
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
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    async function restaurarSesion() {
      try {
        // La cookie HttpOnly se envía automáticamente.
        // Si sigue siendo válida, obtenemos un nuevo access token.
        const { data } = await api.post("/auth/refrescar");

        establecerAccessToken(data.accessToken);

        // Comprobamos además quién es el usuario autenticado.
        const respuestaPerfil = await api.get("/auth/perfil");

        const usuarioActual = respuestaPerfil.data.usuario as Usuario;

        localStorage.setItem("usuario", JSON.stringify(usuarioActual));
        setUsuario(usuarioActual);
      } catch {
        establecerAccessToken(null);
        localStorage.removeItem("usuario");
        setUsuario(null);
      } finally {
        setCargandoSesion(false);
      }
    }

    restaurarSesion();
  }, []);

  function guardarSesion(usuario: Usuario, accessToken: string) {
    localStorage.setItem("usuario", JSON.stringify(usuario));
    establecerAccessToken(accessToken);
    setUsuario(usuario);
  }

  async function cerrarSesion() {
    try {
      // Revoca las sesiones en el servidor y elimina la cookie HttpOnly.
      await api.post("/auth/logout");
    } catch {
      // Aunque falle el backend, limpiamos el estado local.
    }

    establecerAccessToken(null);
    localStorage.removeItem("usuario");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargandoSesion,
        guardarSesion,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return ctx;
}