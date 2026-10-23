import { lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { CarritoProvider } from "./lib/CarritoContext";
import { MainLayout } from "./layouts/MainLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CarritoDrawer } from "./components/CarritoDrawer";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Login = lazy(() => import("./pages/auth/Login"));
const Registro = lazy(() => import("./pages/auth/Registro"));
const Catalogo = lazy(() => import("./pages/catalogo/Catalogo"));
const MisAlquileres = lazy(() => import("./pages/alquileres/MisAlquileres"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Devoluciones = lazy(() => import("./pages/admin/Devoluciones"));  
const Proveedores = lazy(() => import("./pages/admin/Proveedores"));
const InventarioFisico = lazy(() => import("./pages/admin/InventarioFisico"));
const PagoExitoso = lazy(() => import("./pages/pago/PagoExitoso"));
const CrearDisfraz = lazy(() => import("./pages/admin/CrearDisfraz"));
const Perfil = lazy(() => import("./pages/perfil/Perfil"));
const Usuarios = lazy(() => import("./pages/admin/Usuarios"));
const Almacen = lazy(() => import("./pages/admin/Almacen"));
const Recetas = lazy(() => import("./pages/admin/Recetas"));
const DisfrazAMedida = lazy(() => import("./pages/a-medida/DisfrazAMedida"));
const PedidosAMedida = lazy(() => import("./pages/admin/PedidosAMedida"));

function Inicio() {
  const { usuario } = useAuth();
  return <Navigate to={usuario?.rol === "ADMINISTRADOR" ? "/admin/dashboard" : "/catalogo"} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CarritoProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Inicio />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Registro />} />
                <Route path="/catalogo" element={<Catalogo />} />
                <Route path="/mis-alquileres" element={<ProtectedRoute><MisAlquileres /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="/a-medida" element={<ProtectedRoute><DisfrazAMedida /></ProtectedRoute>} />
                <Route path="/pago-exitoso" element={<ProtectedRoute><PagoExitoso /></ProtectedRoute>} />
                <Route
                  path="/admin/dashboard"
                  element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><Dashboard /></ProtectedRoute>}
                />
                <Route
                  path="/admin/devoluciones"
                  element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><Devoluciones /></ProtectedRoute>}
                />
                <Route
                  path="/admin/proveedores"
                  element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><Proveedores /></ProtectedRoute>}
                />
                <Route
                  path="/admin/inventario"
                  element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><InventarioFisico /></ProtectedRoute>}
                />
                <Route
                  path="/admin/usuarios"
                  element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><Usuarios /></ProtectedRoute>}
                />
                <Route
                  path="/admin/disfraces/nuevo"
                  element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><CrearDisfraz /></ProtectedRoute>}
                />
                <Route
                  path="/admin/almacen"
                  element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><Almacen /></ProtectedRoute>}
                />
                <Route
                  path="/admin/recetas"
                  element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><Recetas /></ProtectedRoute>}
                />
                <Route
                  path="/admin/a-medida"
                  element={<ProtectedRoute rolesPermitidos={["ADMINISTRADOR"]}><PedidosAMedida /></ProtectedRoute>}
                />
              </Route>
            </Routes>
            <CarritoDrawer />
          </BrowserRouter>
        </CarritoProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}