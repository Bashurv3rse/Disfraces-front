import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("../../src/lib/api", () => ({
  api: apiMock,
}));

import Devoluciones from "../../src/pages/admin/Devoluciones";

const devolucionPendiente = {
  id: "devolucion-12345678",
  fechaDevolucion: "2026-10-25T15:00:00.000Z",
  observaciones: null,

  garantiaEstado: "PENDIENTE",
  garantiaMonto: null,
  garantiaMotivo: null,
  garantiaReembolsoId: null,
  garantiaResueltaEn: null,

  resueltaPor: null,

  prendas: [
    {
      id: "dev-prenda-1",
      prendaId: "prenda-1",
      estadoPrenda: "BUEN_ESTADO",
      estadoAdmin: null,
      observacion: null,
      prenda: {
        id: "prenda-1",
        nombre: "Camisa roja",
        tipo: "CAMISA",
        color: "rojo",
        talla: "M",
      },
    },
  ],

  alquiler: {
    id: "alquiler-1",
    evento: "Fiesta",
    montoGarantia: "25.00",
    stripeSessionId: "cs_test_123",
    usuario: {
      nombre: "Cliente Prueba",
      email: "cliente@test.com",
    },
    disfraces: [
      {
        disfrazFisico: {
          nombre: "Bombero #1",
        },
      },
    ],
  },
};

function renderPagina() {
  return render(
    <MemoryRouter>
      <Devoluciones />
    </MemoryRouter>
  );
}

describe("Pruebas funcionales - Devoluciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMock.get.mockResolvedValue({
      data: [devolucionPendiente],
    });

    apiMock.patch.mockResolvedValue({
      data: devolucionPendiente,
    });

    apiMock.post.mockResolvedValue({
      data: devolucionPendiente,
    });
  });

  it("PF-FE-55: carga las devoluciones pendientes y muestra sus datos principales", async () => {
    renderPagina();

    expect(
      screen.getByRole("heading", {
        name: "Devoluciones y garantías",
      })
    ).toBeInTheDocument();

    expect(
      await screen.findByText("Cliente Prueba")
    ).toBeInTheDocument();

    expect(
      screen.getByText("cliente@test.com")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Bombero #1")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Camisa roja")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Todas las prendas están en buen estado: corresponde devolver la garantía."
      )
    ).toBeInTheDocument();

    expect(apiMock.get).toHaveBeenCalledWith(
      "/devoluciones"
    );
  });

  it("PF-FE-56: permite al administrador corregir el estado de una prenda devuelta", async () => {
    const corregida = {
      ...devolucionPendiente,
      prendas: [
        {
          ...devolucionPendiente.prendas[0],
          estadoAdmin: "DANADA",
        },
      ],
    };

    apiMock.patch.mockResolvedValue({
      data: corregida,
    });

    renderPagina();

    const selector = await screen.findByLabelText(
      "Estado de Camisa roja según tu revisión"
    );

    fireEvent.change(selector, {
      target: {
        value: "DANADA",
      },
    });

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith(
        "/devoluciones/devolucion-12345678/prendas/prenda-1",
        {
          estado: "DANADA",
          observacion: "",
        }
      );
    });

    expect(
      await screen.findByText(
        /Hay 1 prenda\(s\) con problemas/
      )
    ).toBeInTheDocument();
  });

  it("PF-FE-57: permite devolver la garantía cuando las prendas están en buen estado", async () => {
    const resuelta = {
      ...devolucionPendiente,
      garantiaEstado: "DEVUELTA",
      garantiaMonto: "25.00",
      garantiaReembolsoId: "re_123",
      garantiaResueltaEn:
        "2026-10-25T16:00:00.000Z",
      resueltaPor: {
        nombre: "Administrador",
      },
    };

    apiMock.post.mockResolvedValue({
      data: resuelta,
    });

    renderPagina();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Devolver garantía · S/ 25.00",
      })
    );

    expect(
      screen.getByText(
        /Se reembolsarán S\/ 25.00 a la tarjeta/
      )
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Sí, devolver S/ 25.00",
      })
    );

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith(
        "/devoluciones/devolucion-12345678/garantia",
        {
          accion: "DEVOLVER",
          motivo: undefined,
        }
      );
    });

    expect(
    await screen.findByText(
        "Garantía de Cliente Prueba devuelta: S/ 25.00."
    )
    ).toBeInTheDocument();

    expect(
    screen.getByRole("tab", {
        name: "Por resolver (0)",
    })
    ).toBeInTheDocument();

    expect(
    screen.getByRole("tab", {
        name: "Resueltas (1)",
    })
    ).toBeInTheDocument();

    fireEvent.click(
    screen.getByRole("tab", {
        name: "Resueltas (1)",
    })
    );

    expect(
    screen.getByText(/Garantía devuelta/)
    ).toBeInTheDocument();

    expect(
    screen.getByText("re_123")
    ).toBeInTheDocument();
        });

  it("PF-FE-58: exige un motivo válido antes de permitir retener la garantía", async () => {
    renderPagina();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Retener garantía",
      })
    );

    const confirmar = screen.getByRole(
      "button",
      {
        name: "Confirmar retención",
      }
    );

    expect(confirmar).toBeDisabled();

    fireEvent.change(
      screen.getByLabelText(
        "Motivo de la retención (obligatorio)"
      ),
      {
        target: {
          value: "Daño detectado en la prenda",
        },
      }
    );

    expect(confirmar).toBeEnabled();

    fireEvent.click(confirmar);

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith(
        "/devoluciones/devolucion-12345678/garantia",
        {
          accion: "RETENER",
          motivo:
            "Daño detectado en la prenda",
        }
      );
    });
  });

  it("PF-FE-59: muestra el mensaje del backend cuando falla la resolución de la garantía", async () => {
    apiMock.post.mockRejectedValueOnce({
      response: {
        data: {
          mensaje:
            "No se pudo resolver la garantía",
        },
      },
    });

    renderPagina();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Devolver garantía · S/ 25.00",
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Sí, devolver S/ 25.00",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "No se pudo resolver la garantía"
    );
  });
});