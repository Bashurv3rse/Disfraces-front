import axios from "axios";

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");

// El access token vive únicamente en memoria.
// Al recargar/cerrar la página desaparece.
let accessTokenEnMemoria: string | null = null;

export function establecerAccessToken(token: string | null) {
  accessTokenEnMemoria = token;
}

export const api = axios.create({
  baseURL: BASE_URL,
  // Permite que el navegador envíe la cookie HttpOnly del refresh token.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessTokenEnMemoria) {
    config.headers.Authorization = `Bearer ${accessTokenEnMemoria}`;
  }

  return config;
});

let refrescoEnCurso: Promise<string | null> | null = null;

async function intentarRefrescar(): Promise<string | null> {
  try {
    // No enviamos refreshToken en el body.
    // El navegador lo envía automáticamente mediante la cookie HttpOnly.
    const { data } = await axios.post(
      `${BASE_URL}/auth/refrescar`,
      {},
      { withCredentials: true }
    );

    establecerAccessToken(data.accessToken);

    return data.accessToken as string;
  } catch {
    establecerAccessToken(null);
    return null;
  }
}

api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error) => {
    const peticionOriginal = error.config;

    const esPeticionDeRefresh =
      peticionOriginal?.url?.includes("/auth/refrescar");

    if (
      error.response?.status === 401 &&
      peticionOriginal &&
      !peticionOriginal._reintentado &&
      !esPeticionDeRefresh
    ) {
      peticionOriginal._reintentado = true;

      // Si varias peticiones reciben 401 simultáneamente,
      // todas esperan el mismo refresh.
      if (!refrescoEnCurso) {
        refrescoEnCurso = intentarRefrescar().finally(() => {
          refrescoEnCurso = null;
        });
      }

      const nuevoToken = await refrescoEnCurso;

      if (nuevoToken) {
        peticionOriginal.headers.Authorization = `Bearer ${nuevoToken}`;
        return api(peticionOriginal);
      }

      // Si tampoco podemos renovar la sesión, volvemos al login.
      localStorage.removeItem("usuario");
      establecerAccessToken(null);

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
