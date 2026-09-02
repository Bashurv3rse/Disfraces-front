import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import { MainLayout } from "./layouts/MainLayout";

// WPO — code-splitting por ruta: cada página se descarga solo cuando el usuario
// navega a ella, en vez de ir todo en un único bundle inicial.
const Login = lazy(() => import("./pages/auth/Login"));
const Registro = lazy(() => import("./pages/auth/Registro"));
const Catalogo = lazy(() => import("./pages/catalogo/Catalogo"));
const Conjuntos = lazy(() => import("./pages/conjuntos/Conjuntos"));

function CargandoPagina() {
  return <p role="status" style={{ padding: "var(--space-6)" }}>Cargando…</p>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<CargandoPagina />}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/catalogo" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/catalogo" element={<Catalogo />} />
              <Route path="/conjuntos" element={<Conjuntos />} />
              {/* Rutas de administración (conjuntos, proveedores) se agregan aquí en el Sprint 3 */}
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
