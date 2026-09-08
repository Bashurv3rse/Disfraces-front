import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import "../../styles/ui.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const { guardarSesion } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      guardarSesion(data.usuario, data.token);
      navigate(data.usuario.rol === "ADMINISTRADOR" ? "/admin/dashboard" : "/catalogo");
    } catch (err: any) {
      setError(err.response?.data?.mensaje || "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="card form-card">
      <h1 style={{ marginBottom: "var(--space-5)", fontSize: "1.5rem" }}>Iniciar sesión</h1>

      {error && (
        <div className="alert alert--danger" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn--primary" style={{ width: "100%" }} disabled={cargando}>
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <p style={{ marginTop: "var(--space-4)", color: "var(--text-muted)", fontSize: "0.9rem" }}>
        ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </div>
  );
}