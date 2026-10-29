import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  usuario: null as any,
  cargandoSesion: false,
}));

vi.mock("../../src/lib/AuthContext", () => ({
  useAuth: () => authMock,
}));

import { ProtectedRoute } from "../../src/components/ProtectedRoute";

function renderRutaProtegida(rolesPermitidos?: string[]) {
  return render(
    <MemoryRouter initialEntries={["/protegida"]}>
      <Routes>
        <Route
          path="/protegida"
          element={
            <ProtectedRoute rolesPermitidos={rolesPermitidos}>
              <div>Contenido protegido</div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/login"
          element={<div>Página de login</div>}
        />

        <Route
          path="/catalogo"
          element={<div>Página de catálogo</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("Pruebas funcionales - ProtectedRoute", () => {
  beforeEach(() => {
    authMock.usuario = null;
    authMock.cargandoSesion = false;
  });

  it("PF-FE-21: no muestra contenido protegido mientras se verifica la sesión", () => {
    authMock.cargandoSesion = true;

    renderRutaProtegida();

    expect(
      screen.queryByText("Contenido protegido")
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("Página de login")
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("Página de catálogo")
    ).not.toBeInTheDocument();
  });

  it("PF-FE-22: redirige al login cuando no existe un usuario autenticado", () => {
    authMock.usuario = null;

    renderRutaProtegida();

    expect(
      screen.getByText("Página de login")
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Contenido protegido")
    ).not.toBeInTheDocument();
  });

  it("PF-FE-23: permite acceder a una ruta protegida cuando el usuario está autenticado", () => {
    authMock.usuario = {
      id: "usuario-1",
      nombre: "Cliente Prueba",
      email: "cliente@example.com",
      rol: "CLIENTE",
    };

    renderRutaProtegida();

    expect(
      screen.getByText("Contenido protegido")
    ).toBeInTheDocument();
  });

  it("PF-FE-24: permite acceder cuando el rol del usuario está autorizado", () => {
    authMock.usuario = {
      id: "admin-1",
      nombre: "Administrador",
      email: "admin@example.com",
      rol: "ADMINISTRADOR",
    };

    renderRutaProtegida(["ADMINISTRADOR"]);

    expect(
      screen.getByText("Contenido protegido")
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Página de catálogo")
    ).not.toBeInTheDocument();
  });

  it("PF-FE-25: redirige al catálogo cuando el usuario no posee un rol permitido", () => {
    authMock.usuario = {
      id: "cliente-1",
      nombre: "Cliente Prueba",
      email: "cliente@example.com",
      rol: "CLIENTE",
    };

    renderRutaProtegida(["ADMINISTRADOR"]);

    expect(
      screen.getByText("Página de catálogo")
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Contenido protegido")
    ).not.toBeInTheDocument();
  });
});