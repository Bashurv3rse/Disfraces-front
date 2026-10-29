import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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

import InventarioFisico from "../../src/pages/admin/InventarioFisico";

const listaBase = [
  {
    id: "disfraz-1",
    nombre: "Pirata #2",
    tipoDisfraz: "PIRATA",
    estado: "DISPONIBLE",
    faseLavado: null,
    faltantes: 0,
    prestamosSalientes: 0,
  },
  {
    id: "disfraz-2",
    nombre: "Princesa #1",
    tipoDisfraz: "PRINCESA",
    estado: "INCOMPLETO",
    faseLavado: null,
    faltantes: 1,
    prestamosSalientes: 0,
  },
];

const detalleDisponible = {
  id: "disfraz-1",
  nombre: "Pirata #2",
  familia: "Pirata",
  grupoCompatibilidad: "piratas",
  tipoDisfraz: "PIRATA",
  precioAlquiler: "50.00",
  estado: "DISPONIBLE",
  faseLavado: null,
  faltantes: 0,
  prestamosSalientes: 0,
  prendas: [
    {
      id: "prenda-1",
      nombre: "Camisa pirata",
      tipo: "CAMISA",
      color: "blanco",
      talla: "M",
      calidad: "BUENA",
      estado: "DISPONIBLE",
      situacion: "PRESENTE",
      prestadaA: null,
      reemplazo: null,
      apartada: false,
    },
  ],
  prestamosRecibidos: [],
};

function configurarApi({
  lista = listaBase,
  detalle = detalleDisponible,
}: {
  lista?: any[];
  detalle?: any;
} = {}) {
  apiMock.get.mockImplementation((url: string) => {
    if (url === "/disfraces") {
      return Promise.resolve({
        data: lista,
      });
    }

    if (url.endsWith("/inventario")) {
      return Promise.resolve({
        data: detalle,
      });
    }

    return Promise.reject(
      new Error(`GET no simulado: ${url}`)
    );
  });

  apiMock.patch.mockResolvedValue({
    data: {},
  });

  apiMock.post.mockResolvedValue({
    data: {},
  });
}

function renderPagina() {
  return render(
    <MemoryRouter>
      <InventarioFisico />
    </MemoryRouter>
  );
}

describe("Pruebas funcionales - Inventario físico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PF-FE-45: carga el inventario y muestra los disfraces agrupados por tipo", async () => {
    configurarApi();

    renderPagina();

    expect(
      screen.getByRole("heading", {
        name: "Inventario Físico",
      })
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("button", {
        name: /Pirata #2/,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Princesa #1/,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "PIRATA",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "PRINCESA",
      })
    ).toBeInTheDocument();

    expect(apiMock.get).toHaveBeenCalledWith(
      "/disfraces"
    );
  });

  it("PF-FE-46: selecciona automáticamente el primer disfraz y carga su inventario", async () => {
    configurarApi();

    renderPagina();

    expect(
      await screen.findByRole("heading", {
        name: "Pirata #2",
      })
    ).toBeInTheDocument();

    expect(apiMock.get).toHaveBeenCalledWith(
      "/disfraces/disfraz-1/inventario"
    );

    expect(
      screen.getByText("Camisa pirata")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Presente")
    ).toBeInTheDocument();
  });

  it("PF-FE-47: filtra los disfraces por nombre usando el buscador", async () => {
    configurarApi();

    renderPagina();

    await screen.findByRole("button", {
      name: /Pirata #2/,
    });

    fireEvent.change(
      screen.getByLabelText("Buscar disfraz"),
      {
        target: {
          value: "princesa",
        },
      }
    );

    expect(
      screen.queryByRole("button", {
        name: /Pirata #2/,
      })
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Princesa #1/,
      })
    ).toBeInTheDocument();
  });

  it("PF-FE-48: permite marcar como faltante una prenda presente", async () => {
    configurarApi();

    renderPagina();

    const boton = await screen.findByRole(
      "button",
      {
        name: "Marcar faltante",
      }
    );

    fireEvent.click(boton);

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith(
        "/disfraces/prendas/prenda-1",
        {
          estado: "FALTANTE",
        }
      );
    });
  });

  it("PF-FE-49: permite marcar un disfraz disponible como en reparación", async () => {
    configurarApi();

    renderPagina();

    const boton = await screen.findByRole(
      "button",
      {
        name: "Marcar en reparación",
      }
    );

    fireEvent.click(boton);

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith(
        "/disfraces/disfraz-1/estado-manual",
        {
          estado: "EN_REPARACION",
        }
      );
    });
  });

  it("PF-FE-50: bloquea las modificaciones cuando el disfraz está alquilado", async () => {
    configurarApi({
      lista: [
        {
          id: "disfraz-1",
          nombre: "Pirata #2",
          tipoDisfraz: "PIRATA",
          estado: "ALQUILADO",
          faseLavado: null,
          faltantes: 0,
          prestamosSalientes: 0,
        },
      ],
      detalle: {
        ...detalleDisponible,
        estado: "ALQUILADO",
      },
    });

    renderPagina();

    expect(
      await screen.findByText(
        /Este disfraz está alquilado/
      )
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Marcar faltante",
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Marcar en reparación",
      })
    ).not.toBeInTheDocument();
  });

  it("PF-FE-51: una prenda faltante muestra la advertencia y permite buscar reemplazo", async () => {
    configurarApi({
      detalle: {
        ...detalleDisponible,
        estado: "INCOMPLETO",
        faltantes: 1,
        prendas: [
          {
            ...detalleDisponible.prendas[0],
            estado: "FALTANTE",
            situacion: "FALTANTE",
          },
        ],
      },
    });

    apiMock.get.mockImplementation(
      (url: string) => {
        if (url === "/disfraces") {
          return Promise.resolve({
            data: listaBase,
          });
        }

        if (url.endsWith("/inventario")) {
          return Promise.resolve({
            data: {
              ...detalleDisponible,
              estado: "INCOMPLETO",
              faltantes: 1,
              prendas: [
                {
                  ...detalleDisponible.prendas[0],
                  estado: "FALTANTE",
                  situacion: "FALTANTE",
                },
              ],
            },
          });
        }

        if (
          url ===
          "/disfraces/prendas/prenda-1/candidatos"
        ) {
          return Promise.resolve({
            data: [],
          });
        }

        return Promise.reject(
          new Error(`GET no simulado: ${url}`)
        );
      }
    );

    renderPagina();

    expect(
      await screen.findByText(
        /Esta prenda requerida está faltante/
      )
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Buscar reemplazo/,
      })
    );

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledWith(
        "/disfraces/prendas/prenda-1/candidatos"
      );
    });

    expect(
      await screen.findByRole("dialog")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /No hay repuestos de «Camisa pirata»/
      )
    ).toBeInTheDocument();
  });

  it("PF-FE-52: muestra candidatos de reemplazo y permite confirmar un préstamo", async () => {
    configurarApi({
      detalle: {
        ...detalleDisponible,
        estado: "INCOMPLETO",
        faltantes: 1,
        prendas: [
          {
            ...detalleDisponible.prendas[0],
            estado: "FALTANTE",
            situacion: "FALTANTE",
          },
        ],
      },
    });

    apiMock.get.mockImplementation(
      (url: string) => {
        if (url === "/disfraces") {
          return Promise.resolve({
            data: listaBase,
          });
        }

        if (url.endsWith("/inventario")) {
          return Promise.resolve({
            data: {
              ...detalleDisponible,
              estado: "INCOMPLETO",
              faltantes: 1,
              prendas: [
                {
                  ...detalleDisponible.prendas[0],
                  estado: "FALTANTE",
                  situacion: "FALTANTE",
                },
              ],
            },
          });
        }

        if (
          url ===
          "/disfraces/prendas/prenda-1/candidatos"
        ) {
          return Promise.resolve({
            data: [
              {
                id: "donante-1",
                nombre: "Camisa pirata",
                calidad: "BUENA",
                color: "blanco",
                talla: "M",
                disfrazOrigenNombre: "Almacén",
                disfrazOrigenAlquilado: false,
                mismaFamilia: true,
                mismaTalla: true,
                mismoColor: true,
                esAlmacen: true,
              },
            ],
          });
        }

        return Promise.reject(
          new Error(`GET no simulado: ${url}`)
        );
      }
    );

    renderPagina();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /Buscar reemplazo/,
      })
    );

    const dialog =
      await screen.findByRole("dialog");

    expect(
      within(dialog).getByText("✓ Mejor opción")
    ).toBeInTheDocument();

    expect(
      within(dialog).getByText("Almacén")
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Confirmar préstamo",
      })
    );

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith(
        "/disfraces/prendas/prenda-1/prestamo",
        {
          prendaDonanteId: "donante-1",
        }
      );
    });
  });

  it("PF-FE-53: permite recuperar una prenda prestada cuando está disponible", async () => {
    configurarApi({
      detalle: {
        ...detalleDisponible,
        prendas: [
          {
            ...detalleDisponible.prendas[0],
            situacion: "PRESTADA",
            estado: "DISPONIBLE",
            prestadaA: {
              id: "disfraz-otro",
              nombre: "Pirata #5",
              aMedida: false,
            },
            reemplazo: null,
          },
        ],
      },
    });

    renderPagina();

    const boton = await screen.findByRole(
      "button",
      {
        name: "Recuperar prenda",
      }
    );

    expect(boton).toBeEnabled();

    fireEvent.click(boton);

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith(
        "/disfraces/prendas/prenda-1/devolver-prestamo"
      );
    });
  });

  it("PF-FE-54: muestra un error del backend cuando falla una operación del inventario", async () => {
    configurarApi();

    apiMock.patch.mockRejectedValueOnce({
      response: {
        data: {
          mensaje:
            "No se puede modificar esta prenda",
        },
      },
    });

    renderPagina();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Marcar faltante",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "No se puede modificar esta prenda"
    );
  });
});