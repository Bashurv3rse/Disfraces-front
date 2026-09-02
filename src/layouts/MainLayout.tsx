import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import "./main-layout.css";

export function MainLayout() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    cerrarSesion();
    navigate("/login");
  }

  return (
    <div className="layout">
      {/* Landmark de accesibilidad: permite saltar la navegación repetitiva (WCAG 2.4.1) */}
      <a href="#contenido-principal" className="skip-link">Saltar al contenido principal</a>

      <header className="layout__header">
        <Link to="/" className="layout__brand">Alquiler de Disfraces</Link>

        <nav aria-label="Navegación principal" className="layout__nav">
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/conjuntos">Conjuntos</Link>
          {usuario?.rol === "ADMINISTRADOR" && <Link to="/admin/piezas">Administrar piezas</Link>}
        </nav>

        <div className="layout__session">
          {usuario ? (
            <>
              <span className="layout__usuario">Hola, {usuario.nombre}</span>
              <button type="button" onClick={handleLogout} className="btn btn--ghost">
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn--ghost">Iniciar sesión</Link>
          )}
        </div>
      </header>

      <main id="contenido-principal" className="layout__main">
        <Outlet />
      </main>

      <footer className="layout__footer">
        <p>Proyecto académico — UTP · Sistema de Alquiler de Disfraces</p>
      </footer>
    </div>
  );
}
