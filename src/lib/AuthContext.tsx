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
  actualizarUsuario: (usuario: Usuario) => void;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Solo guardamos en localStorage los datos básicos necesarios para la interfaz.
// La autorización real siempre la determina el backend.
function basico(usuario: Usuario): Usuario {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };
}

function leerUsuarioGuardado(): Usuario | null {
  const crudo = localStorage.getItem("usuario");

  if (!crudo) return null;

  try {
    const parseado = JSON.parse(crudo);

    return parseado?.id ? basico(parseado) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(
    leerUsuarioGuardado
  );

  const [cargandoSesion, setCargandoSesion] = useState(true);

  function persistirUsuario(datos: Usuario) {
    const usuarioBasico = basico(datos);

    localStorage.setItem(
      "usuario",
      JSON.stringify(usuarioBasico)
    );

    setUsuario(usuarioBasico);
  }

  useEffect(() => {
    async function restaurarSesion() {
      try {
        // La cookie HttpOnly de refresh se envía automáticamente.
        // Si sigue siendo válida obtenemos un nuevo access token.
        const { data } = await api.post("/auth/refrescar");

        establecerAccessToken(data.accessToken);

        // Consultamos el perfil real del usuario autenticado.
        const respuestaPerfil = await api.get("/auth/perfil");

        const usuarioActual =
          respuestaPerfil.data.usuario as Usuario;

        persistirUsuario(usuarioActual);
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

  function guardarSesion(
    usuario: Usuario,
    accessToken: string
  ) {
    establecerAccessToken(accessToken);
    persistirUsuario(usuario);
  }

  function actualizarUsuario(usuario: Usuario) {
    persistirUsuario(usuario);
  }

  async function cerrarSesion() {
    try {
      // Revoca las sesiones en el servidor
      // y elimina la cookie HttpOnly.
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
        actualizarUsuario,
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
    throw new Error(
      "useAuth debe usarse dentro de AuthProvider"
    );
  }

  return ctx;
}