import axios from "axios";

const BASE_URL = "http://65.52.17.22/api";

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refrescoEnCurso: Promise<string | null> | null = null;

async function intentarRefrescar(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  try {
    // Cliente "limpio" (sin interceptores) para no entrar en loop si esta
    // misma petición también devolviera 401.
    const { data } = await axios.post(`${BASE_URL}/auth/refrescar`, { refreshToken });
    localStorage.setItem("accessToken", data.accessToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error) => {
    const peticionOriginal = error.config;

    if (error.response?.status === 401 && !peticionOriginal._reintentado) {
      peticionOriginal._reintentado = true;

      // Si ya hay un refresh en curso (varias peticiones fallaron a la vez),
      // todas esperan el mismo resultado en vez de refrescar por triplicado.
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

      // El refresh también falló (expiró o es inválido): cerrar sesión de verdad.
      localStorage.removeItem("usuario");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);