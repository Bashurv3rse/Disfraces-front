import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("../../src/lib/api", () => ({
  api: apiMock,
}));

vi.mock(
  "../../src/components/ReportarDevolucion",
  () => ({
    ReportarDevolucion: ({
      alquilerId,
      onCerrar,
      onConfirmado,
    }: {
      alquilerId: string;
      onCerrar: () => void;
      onConfirmado: () => void;
    }) => (
      <div role="dialog">
        <span>
          Devolución del alquiler {alquilerId}
        </span>

        <button onClick={onCerrar}>
          Cerrar devolución
        </button>

        <button onClick={onConfirmado}>
          Confirmar devolución
        </button>
      </div>
    ),
  })
);

import MisAlquileres from "../../src/pages/alquileres/MisAlquileres";

const fechaFutura = "2099-12-31T00:00:00.000Z";
const fechaPasada = "2020-01-01T00:00:00.000Z";

const alquilerActivo = {
  id: "alquiler-activo",
  fechaInicio: "2026-10-20T00:00:00.000Z",
  fechaFin: fechaFutura,
  evento: "Fiesta de disfraces",
  estado: "ACTIVO",
  montoTotal: "125.00",
  montoGarantia: "25.00",
  descuento: "0.00",
  detalleDescuento: null,

  disfraces: [
    {
      precioUnitario: "40.00",
      disfrazFisico: {
        id: "disfraz-1",
        nombre: "Bombero #1",
        tipoDisfraz: "BOMBERO",
        prendasActuales: [
          {
            id: "prenda-1",
            nombre: "Camisa",
            tipo: "CAMISA",
            color: "rojo",
            talla: "M",
          },
        ],
      },
    },
  ],

  devolucion: null,
};

const alquilerFinalizado = {
  ...alquilerActivo,
  id: "alquiler-finalizado",
  evento: "Halloween",
  estado: "FINALIZADO",
  fechaFin: "2026-10-10T00:00:00.000Z",
};

function renderPagina() {
  return render(<MisAlquileres />);
}

describe("Pruebas funcionales - Mis alquileres", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMock.get.mockResolvedValue({
      data: [alquilerActivo],
    });
  });

  it("PF-FE-64: carga y muestra los alquileres activos del usuario", async () => {
    renderPagina();

    expect(
      screen.getByRole("status")
    ).toHaveTextContent("Cargando…");

    expect(
      await screen.findByText(
        "Fiesta de disfraces"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText("Bombero #1")
    ).toBeInTheDocument();

    expect(
      screen.getByText("BOMBERO")
    ).toBeInTheDocument();

    expect(
      screen.getByText("S/ 125.00 total")
    ).toBeInTheDocument();

    expect(apiMock.get).toHaveBeenCalledWith(
      "/alquileres/mios"
    );
  });

  it("PF-FE-65: contabiliza los alquileres activos y pendientes en la misma pestaña", async () => {
    apiMock.get.mockResolvedValue({
      data: [
        alquilerActivo,
        {
          ...alquilerActivo,
          id: "alquiler-pendiente",
          evento: "Reserva pendiente",
          estado: "PENDIENTE",
        },
      ],
    });

    renderPagina();

    expect(
      await screen.findByRole("tab", {
        name: "Activos (2)",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Fiesta de disfraces")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Reserva pendiente")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Pendiente")
    ).toBeInTheDocument();
  });

  it("PF-FE-66: permite cambiar a la pestaña Historial y muestra alquileres finalizados", async () => {
    apiMock.get.mockResolvedValue({
      data: [
        alquilerActivo,
        alquilerFinalizado,
      ],
    });

    renderPagina();

    await screen.findByText(
      "Fiesta de disfraces"
    );

    expect(
      screen.queryByText("Halloween")
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("tab", {
        name: "Historial (1)",
      })
    );

    expect(
      screen.getByText("Halloween")
    ).toBeInTheDocument();

    expect(
      screen.queryByText(
        "Fiesta de disfraces"
      )
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("Finalizado")
    ).toBeInTheDocument();
  });

  it("PF-FE-67: advierte cuando un alquiler activo tiene la devolución vencida", async () => {
    apiMock.get.mockResolvedValue({
      data: [
        {
          ...alquilerActivo,
          fechaFin: fechaPasada,
        },
      ],
    });

    renderPagina();

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Tienes 1 alquiler(es) con la fecha de devolución vencida"
    );

    expect(
      screen.getByText(
        /La fecha de devolución ya pasó/
      )
    ).toBeInTheDocument();
  });

  it("PF-FE-68: muestra el descuento aplicado y su detalle", async () => {
    apiMock.get.mockResolvedValue({
      data: [
        {
          ...alquilerActivo,
          descuento: "12.50",
          detalleDescuento:
            "Promoción por varios días",
        },
      ],
    });

    renderPagina();

    expect(
      await screen.findByText(
        /Descuento aplicado: −S\/ 12.50/
      )
    ).toHaveTextContent(
      "Promoción por varios días"
    );

    expect(
      screen.getByText(
        /Garantía \(25%\): S\/ 25.00/
      )
    ).toBeInTheDocument();
  });

  it("PF-FE-69: muestra cuando la garantía de una devolución está pendiente de revisión", async () => {
    apiMock.get.mockResolvedValue({
      data: [
        {
          ...alquilerFinalizado,
          devolucion: {
            fechaDevolucion:
              "2026-10-11T00:00:00.000Z",
            garantiaEstado: "PENDIENTE",
            garantiaMonto: null,
            garantiaMotivo: null,
            garantiaReembolsoId: null,
            garantiaResueltaEn: null,
            prendas: [
              {
                estadoPrenda: "BUEN_ESTADO",
                estadoAdmin: null,
                observacion: null,
                prenda: {
                  id: "prenda-1",
                  nombre: "Camisa",
                  color: "rojo",
                  talla: "M",
                },
              },
            ],
          },
        },
      ],
    });

    renderPagina();

    fireEvent.click(
      await screen.findByRole("tab", {
        name: "Historial (1)",
      })
    );

    expect(
      screen.getByText(
        "Tu garantía está en revisión"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /confirmaremos si se devuelve tu garantía de S\/ 25.00/
      )
    ).toBeInTheDocument();
  });

  it("PF-FE-70: muestra una garantía devuelta junto con el comprobante de Stripe", async () => {
    apiMock.get.mockResolvedValue({
      data: [
        {
          ...alquilerFinalizado,
          devolucion: {
            fechaDevolucion:
              "2026-10-11T00:00:00.000Z",
            garantiaEstado: "DEVUELTA",
            garantiaMonto: "25.00",
            garantiaMotivo: null,
            garantiaReembolsoId:
              "re_stripe_123",
            garantiaResueltaEn:
              "2026-10-12T00:00:00.000Z",
            prendas: [
              {
                estadoPrenda: "BUEN_ESTADO",
                estadoAdmin: null,
                observacion: null,
                prenda: {
                  id: "prenda-1",
                  nombre: "Camisa",
                  color: "rojo",
                  talla: "M",
                },
              },
            ],
          },
        },
      ],
    });

    renderPagina();

    fireEvent.click(
      await screen.findByRole("tab", {
        name: "Historial (1)",
      })
    );

    expect(
      screen.getByText(
        /Garantía devuelta: S\/ 25.00/
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText("re_stripe_123")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /El reembolso va a la tarjeta/
      )
    ).toBeInTheDocument();
  });

  it("PF-FE-71: muestra una garantía retenida y el motivo correspondiente", async () => {
    apiMock.get.mockResolvedValue({
      data: [
        {
          ...alquilerFinalizado,
          devolucion: {
            fechaDevolucion:
              "2026-10-11T00:00:00.000Z",
            garantiaEstado: "RETENIDA",
            garantiaMonto: "25.00",
            garantiaMotivo:
              "Prenda dañada durante el alquiler",
            garantiaReembolsoId: null,
            garantiaResueltaEn:
              "2026-10-12T00:00:00.000Z",
            prendas: [
              {
                estadoPrenda: "DANADA",
                estadoAdmin: null,
                observacion:
                  "Mancha permanente",
                prenda: {
                  id: "prenda-1",
                  nombre: "Camisa",
                  color: "rojo",
                  talla: "M",
                },
              },
            ],
          },
        },
      ],
    });

    renderPagina();

    fireEvent.click(
      await screen.findByRole("tab", {
        name: "Historial (1)",
      })
    );

    expect(
      screen.getByText(
        /Garantía retenida: S\/ 25.00/
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Motivo: Prenda dañada durante el alquiler"
      )
    ).toBeInTheDocument();
  });

  it("PF-FE-72: permite iniciar la devolución de un alquiler activo", async () => {
    renderPagina();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Devolver",
      })
    );

    expect(
      screen.getByRole("dialog")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Devolución del alquiler alquiler-activo"
      )
    ).toBeInTheDocument();
  });

  it("PF-FE-73: al confirmar una devolución cierra el formulario y recarga los alquileres", async () => {
    renderPagina();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Devolver",
      })
    );

    expect(
      screen.getByRole("dialog")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Confirmar devolución",
      })
    );

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledTimes(2);
    });

    expect(
      screen.queryByRole("dialog")
    ).not.toBeInTheDocument();
  });
});