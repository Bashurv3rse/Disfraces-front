import {
  render,
  screen,
} from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
}));

const carritoMock = vi.hoisted(() => ({
  vaciarCarrito: vi.fn(),
}));

vi.mock("../../src/lib/api", () => ({
  api: apiMock,
}));

vi.mock("../../src/lib/CarritoContext", () => ({
  useCarrito: () => carritoMock,
}));

import PagoExitoso from "../../src/pages/pago/PagoExitoso";

function renderPagina(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route
          path="/pago-exitoso"
          element={<PagoExitoso />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("Pruebas funcionales - Pago exitoso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PF-FE-60: muestra el estado de confirmación mientras se verifica el pago", () => {
    apiMock.post.mockReturnValue(
      new Promise(() => {})
    );

    renderPagina(
      "/pago-exitoso?session_id=cs_test_123"
    );

    expect(
      screen.getByRole("heading", {
        name: "Confirmando tu pago…",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("status")
    ).toHaveTextContent(
      "Estamos verificando el pago con la pasarela"
    );

    expect(apiMock.post).toHaveBeenCalledWith(
      "/pagos/confirmar",
      {
        sessionId: "cs_test_123",
      }
    );
  });

  it("PF-FE-61: confirma el pago, vacía el carrito y muestra el acceso a Mis alquileres", async () => {
    apiMock.post.mockResolvedValue({
      data: {},
    });

    renderPagina(
      "/pago-exitoso?session_id=cs_test_456"
    );

    expect(
      await screen.findByRole("heading", {
        name: "¡Pago confirmado! 🎉",
      })
    ).toBeInTheDocument();

    expect(apiMock.post).toHaveBeenCalledWith(
      "/pagos/confirmar",
      {
        sessionId: "cs_test_456",
      }
    );

    expect(
      carritoMock.vaciarCarrito
    ).toHaveBeenCalledTimes(1);

    const enlace = screen.getByRole("link", {
      name: "Ver mis alquileres",
    });

    expect(enlace).toHaveAttribute(
      "href",
      "/mis-alquileres"
    );
  });

  it("PF-FE-62: muestra error cuando la URL no contiene session_id y no intenta confirmar el pago", async () => {
    renderPagina("/pago-exitoso");

    expect(
      await screen.findByRole("heading", {
        name: "No pudimos confirmar el pago",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("alert")
    ).toHaveTextContent(
      "No se encontró la referencia del pago."
    );

    expect(
      apiMock.post
    ).not.toHaveBeenCalled();

    expect(
      carritoMock.vaciarCarrito
    ).not.toHaveBeenCalled();
  });

  it("PF-FE-63: muestra el mensaje del backend cuando la confirmación del pago falla", async () => {
    apiMock.post.mockRejectedValue({
      response: {
        data: {
          mensaje:
            "El pago todavía no ha sido completado",
        },
      },
    });

    renderPagina(
      "/pago-exitoso?session_id=cs_test_no_pagado"
    );

    expect(
      await screen.findByRole("heading", {
        name: "No pudimos confirmar el pago",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("alert")
    ).toHaveTextContent(
      "El pago todavía no ha sido completado"
    );

    expect(
      carritoMock.vaciarCarrito
    ).not.toHaveBeenCalled();

    expect(
      screen.getByRole("link", {
        name: "Volver al catálogo",
      })
    ).toHaveAttribute("href", "/catalogo");
  });
});