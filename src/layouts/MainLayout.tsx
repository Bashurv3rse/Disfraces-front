import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useCarrito } from "../lib/CarritoContext";
import "./main-layout.css";

export function MainLayout() {
  const { usuario, cerrarSesion } = useAuth();
  const { items, abrirCarrito } = useCarrito();
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === "ADMINISTRADOR";

  function handleLogout() {
    cerrarSesion();
    navigate("/login");
  }

  return (
    <div className="layout">
      <a href="#contenido-principal" className="skip-link">Saltar al contenido principal</a>

      <header className="layout__header">
        <Link to="/" className="layout__brand">DisfracesPro</Link>

        <nav aria-label="Navegación principal" className="layout__nav">
          {esAdmin ? (
            <>
              <Link to="/conjuntos/nuevo">Crear conjunto</Link>
              {/* Dashboard, Devoluciones, Reportes, Proveedores y Stock se agregan en Sprint 4-5 */}
            </>
          ) : (
            <>
              <Link to="/catalogo">Catálogo</Link>
              <Link to="/conjuntos">Conjuntos</Link>
              {usuario && <Link to="/conjuntos/nuevo">Armar conjunto</Link>}
              {usuario && <Link to="/mis-alquileres">Mis alquileres</Link>}
            </>
          )}
        </nav>

        <div className="layout__session">
          {usuario && !esAdmin && (
            <button
              type="button"
              onClick={abrirCarrito}
              className="btn btn--primary"
              aria-label={`Abrir carrito, ${items.length} artículos`}
            >
              🛒 Carrito {items.length > 0 && `(${items.length})`}
            </button>
          )}
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
    </div>
  );
}