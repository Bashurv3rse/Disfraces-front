import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, establecerAccessToken } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import "./perfil.css";

interface PerfilCompleto {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  rol: "CLIENTE" | "ADMINISTRADOR" | "PROVEEDOR";
  creadoEn: string;
}

interface RespuestaError {
  errores?: Record<string, string[] | undefined>;
  mensaje?: string;
}

const ETIQUETA_ROL: Record<PerfilCompleto["rol"], string> = {
  CLIENTE: "Cliente",
  ADMINISTRADOR: "Administrador",
  PROVEEDOR: "Proveedor",
};

function leerError(err: unknown): RespuestaError {
  return (err as { response?: { data?: RespuestaError } })?.response?.data ?? {};
}

interface CampoProps {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio?: (valor: string) => void;
  tipo?: string;
  autoComplete?: string;
  soloLectura?: boolean;
  error?: string;
  ayuda?: string;
}

function Campo({ id, etiqueta, valor, onCambio, tipo = "text", autoComplete, soloLectura, error, ayuda }: CampoProps) {
  const descritoPor = [ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        type={tipo}
        autoComplete={autoComplete}
        readOnly={soloLectura}
        required={!soloLectura}
        value={valor}
        onChange={onCambio ? (e) => onCambio(e.target.value) : undefined}
        aria-invalid={!!error}
        aria-describedby={descritoPor}
      />
      {ayuda && (
        <span id={`${id}-ayuda`} className="perfil__ayuda">
          {ayuda}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default function Perfil() {
  const { actualizarUsuario } = useAuth();

  const [perfil, setPerfil] = useState<PerfilCompleto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Datos personales
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [erroresDatos, setErroresDatos] = useState<Record<string, string[] | undefined>>({});
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [exitoDatos, setExitoDatos] = useState(false);
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  // Contraseña
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erroresPass, setErroresPass] = useState<Record<string, string[] | undefined>>({});
  const [errorPass, setErrorPass] = useState<string | null>(null);
  const [exitoPass, setExitoPass] = useState(false);
  const [guardandoPass, setGuardandoPass] = useState(false);

  function cargarFormulario(p: PerfilCompleto) {
    setPerfil(p);
    setNombre(p.nombre);
    setTelefono(p.telefono);
    setDireccion(p.direccion);
  }

  useEffect(() => {
    api
      .get("/auth/perfil")
      .then(({ data }) => cargarFormulario(data.usuario))
      .catch(() => setErrorCarga("No se pudo cargar tu perfil. Intenta de nuevo."))
      .finally(() => setCargando(false));
  }, []);

  const hayCambios =
    !!perfil &&
    (nombre.trim() !== perfil.nombre.trim() || telefono.trim() !== perfil.telefono.trim() || direccion.trim() !== perfil.direccion.trim());

  async function handleGuardarDatos(e: FormEvent) {
    e.preventDefault();
    setErroresDatos({});
    setErrorDatos(null);
    setExitoDatos(false);
    setGuardandoDatos(true);
    try {
      const { data } = await api.patch("/auth/perfil", { nombre, telefono, direccion });
      cargarFormulario(data.usuario);
      actualizarUsuario(data.usuario); // el "Hola, …" del encabezado se actualiza al instante
      setExitoDatos(true);
    } catch (err) {
      const resp = leerError(err);
      if (resp.errores) setErroresDatos(resp.errores);
      else setErrorDatos(resp.mensaje || "No se pudieron guardar los cambios.");
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function handleCambiarPassword(e: FormEvent) {
    e.preventDefault();
    setErroresPass({});
    setErrorPass(null);
    setExitoPass(false);

    if (passwordNueva !== confirmar) {
      setErroresPass({ confirmar: ["Las contraseñas no coinciden"] });
      return;
    }

    setGuardandoPass(true);
    try {
    const { data } = await api.patch("/auth/perfil/password", {
        passwordActual,
        passwordNueva,
    });

    // El cambio de contraseña revoca las sesiones anteriores.
    // Guardamos en memoria el nuevo access token generado por el backend.
    establecerAccessToken(data.accessToken);

    setPasswordActual("");
    setPasswordNueva("");
    setConfirmar("");
    setExitoPass(true);
    } catch (err) {
      const resp = leerError(err);
      if (resp.errores) setErroresPass(resp.errores);
      else setErrorPass(resp.mensaje || "No se pudo cambiar la contraseña.");
    } finally {
      setGuardandoPass(false);
    }
  }

  if (cargando) return <p role="status">Cargando tu perfil…</p>;

  if (errorCarga || !perfil) {
    return (
      <div className="alert alert--danger" role="alert">
        {errorCarga || "No se pudo cargar tu perfil."}
      </div>
    );
  }

  const miembroDesde = new Date(perfil.creadoEn).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="perfil">
      <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-1)" }}>Mi perfil</h1>
      <p className="perfil__subtitulo">Aquí ves y actualizas solo tus propios datos.</p>

      <div className="perfil__grid">
        <form className="card perfil__card" onSubmit={handleGuardarDatos} noValidate>
          <h2>Datos personales</h2>
          <p className="perfil__card-desc">Estos datos se usan para contactarte por tus alquileres.</p>

          {errorDatos && (
            <div className="alert alert--danger" role="alert">
              {errorDatos}
            </div>
          )}
          {exitoDatos && (
            <p className="perfil__exito" role="status">
              Datos actualizados correctamente.
            </p>
          )}

          <Campo id="perfil-nombre" etiqueta="Nombre" valor={nombre} onCambio={setNombre} autoComplete="name" error={erroresDatos.nombre?.[0]} />
          <Campo
            id="perfil-email"
            etiqueta="Correo electrónico"
            valor={perfil.email}
            soloLectura
            ayuda="El correo es tu identificador de acceso y no se puede cambiar."
          />
          <Campo id="perfil-telefono" etiqueta="Teléfono" valor={telefono} onCambio={setTelefono} tipo="tel" autoComplete="tel" error={erroresDatos.telefono?.[0]} />
          <Campo id="perfil-direccion" etiqueta="Dirección principal" valor={direccion} onCambio={setDireccion} autoComplete="street-address" error={erroresDatos.direccion?.[0]} />

          <div className="perfil__meta">
            <div>
              <span className="perfil__meta-etiqueta">Rol</span>
              <strong>{ETIQUETA_ROL[perfil.rol]}</strong>
            </div>
            <div>
              <span className="perfil__meta-etiqueta">Miembro desde</span>
              <strong>{miembroDesde}</strong>
            </div>
          </div>

          <button type="submit" className="btn btn--primary" disabled={guardandoDatos || !hayCambios}>
            {guardandoDatos ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>

        <form className="card perfil__card" onSubmit={handleCambiarPassword} noValidate>
          <h2>Seguridad</h2>
          <p className="perfil__card-desc">
            Al cambiar la contraseña se cerrará tu sesión en los demás dispositivos.
          </p>

          {errorPass && (
            <div className="alert alert--danger" role="alert">
              {errorPass}
            </div>
          )}
          {exitoPass && (
            <p className="perfil__exito" role="status">
              Contraseña actualizada. Se cerraron tus otras sesiones.
            </p>
          )}

          <Campo
            id="perfil-pass-actual"
            etiqueta="Contraseña actual"
            valor={passwordActual}
            onCambio={setPasswordActual}
            tipo="password"
            autoComplete="current-password"
            error={erroresPass.passwordActual?.[0]}
          />
          <Campo
            id="perfil-pass-nueva"
            etiqueta="Contraseña nueva"
            valor={passwordNueva}
            onCambio={setPasswordNueva}
            tipo="password"
            autoComplete="new-password"
            ayuda="Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo (ej. !@#$)."
            error={erroresPass.passwordNueva?.[0]}
          />
          <Campo
            id="perfil-pass-confirmar"
            etiqueta="Confirmar contraseña nueva"
            valor={confirmar}
            onCambio={setConfirmar}
            tipo="password"
            autoComplete="new-password"
            error={erroresPass.confirmar?.[0]}
          />

          <button
            type="submit"
            className="btn btn--primary"
            disabled={guardandoPass || !passwordActual || !passwordNueva || !confirmar}
          >
            {guardandoPass ? "Cambiando…" : "Cambiar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}