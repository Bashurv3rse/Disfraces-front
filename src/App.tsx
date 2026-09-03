import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import { CarritoProvider } from "./lib/CarritoContext";
import { AlquileresProvider } from "./lib/AlquileresContext";
import { MainLayout } from "./layouts/MainLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CarritoDrawer } from "./components/CarritoDrawer";

const Login = lazy(() => import("./pages/auth/Login"));
const Registro = lazy(() => import("./pages/auth/Registro"));
const Catalogo = lazy(() => import("./pages/catalogo/Catalogo"));
const Conjuntos = lazy(() => import("./pages/conjuntos/Conjuntos"));
const ArmarConjunto = lazy(() => import("./pages/conjuntos/ArmarConjunto"));
const MisAlquileres = lazy(() => import("./pages/alquileres/MisAlquileres"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Devoluciones = lazy(() => import("./pages/admin/Devoluciones"));

function CargandoPagina() {
  return <p role="status" style={{ padding: "var(--space-6)" }}>Cargando…</p>;
}

export default function App() {
  return (
    <AuthProvider>
      <CarritoProvider>
        <AlquileresProvider>
          <BrowserRouter>
            <Suspense fallback={<CargandoPagina />}>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Navigate to="/catalogo" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/registro" element={<Registro />} />
                  <Route path="/catalogo" element={<Catalogo />} />
                  <Route path="/conjuntos" element={<Conjuntos />} />
                  <Route path="/conjuntos/nuevo" element={<ProtectedRoute><ArmarConjunto /></ProtectedRoute>} />
                  <Route path="/mis-alquileres" element={<ProtectedRoute><MisAlquileres /></ProtectedRoute>} />
                  <Route
                    path="/admin/dashboard"
                    element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><Dashboard /></ProtectedRoute>}
                  />
                  <Route
                    path="/admin/devoluciones"
                    element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><Devoluciones /></ProtectedRoute>}
                  />
                </Route>
              </Routes>
            </Suspense>
            <CarritoDrawer />
          </BrowserRouter>
        </AlquileresProvider>
      </CarritoProvider>
    </AuthProvider>
  );
}