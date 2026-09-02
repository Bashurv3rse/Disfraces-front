import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import "../../styles/ui.css";

interface ErroresCampo {
  nombre?: string[];
  email?: string[];
  password?: string[];
}

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erroresCampo, setErroresCampo] = useState<ErroresCampo>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const { guardarSesion } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroresCampo({});
    setErrorGeneral(null);
    setCargando(true);
    try {
      const { data } = await api.post("/auth/registro", { nombre, email, password });
      guardarSesion(data.usuario, data.token);
      navigate("/catalogo");
    } catch (err: any) {
      if (err.response?.data?.errores) {
        setErroresCampo(err.response.data.errores);
      } else {
        setErrorGeneral(err.response?.data?.mensaje || "No se pudo completar el registro");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="card form-card">
      <h1 style={{ marginBottom: "var(--space-5)", fontSize: "1.5rem" }}>Crear cuenta</h1>

      {errorGeneral && (
        <div className="alert alert--danger" role="alert">
          {errorGeneral}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            type="text"
            autoComplete="name"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            aria-invalid={!!erroresCampo.nombre}
            aria-describedby={erroresCampo.nombre ? "nombre-error" : undefined}
          />
          {erroresCampo.nombre && (
            <span id="nombre-error" className="field__error" role="alert">
              {erroresCampo.nombre[0]}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!erroresCampo.email}
            aria-describedby={erroresCampo.email ? "email-error" : undefined}
          />
          {erroresCampo.email && (
            <span id="email-error" className="field__error" role="alert">
              {erroresCampo.email[0]}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!erroresCampo.password}
            aria-describedby={erroresCampo.password ? "password-error" : undefined}
          />
          {erroresCampo.password && (
            <span id="password-error" className="field__error" role="alert">
              {erroresCampo.password[0]}
            </span>
          )}
        </div>

        <button type="submit" className="btn btn--primary" style={{ width: "100%" }} disabled={cargando}>
          {cargando ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p style={{ marginTop: "var(--space-4)", color: "var(--text-muted)", fontSize: "0.9rem" }}>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}
