import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

const carritoMock = vi.hoisted(() => ({
  items: [] as any[],
  agregarItem: vi.fn(),
  quitarItem: vi.fn(),
}));

vi.mock("../../src/lib/api", () => ({
  api: apiMock,
}));

vi.mock("../../src/lib/CarritoContext", () => ({
  useCarrito: () => carritoMock,
}));

vi.mock("../../src/lib/useAhora", () => ({
  useAhora: () => Date.now(),
  formatearCuenta: () => "19:00",
}));

import DisfrazAMedida from "../../src/pages/a-medida/DisfrazAMedida";

const recetaBombero = {
  id: "receta-1",
  nombre: "Bombero",
  descripcion: "Disfraz de bombero",
  precioDia: 50,
  pideTallaRopa: true,
  pideTallaCalzado: false,
  piezas: [
    {
      id: "pieza-1",
      etiqueta: "Camisa",
      tipo: "CAMISA",
      categoriaTalla: "ROPA",
      obligatoria: true,
    },
  ],
};

const propuestaCompleta = {
  receta: {
    id: "receta-1",
    nombre: "Bombero",
    precioDia: 50,
  },
  completo: true,
  piezas: [
    {
      huecoId: "pieza-1",
      etiqueta: "Camisa",
      tipo: "CAMISA",
      nombre: "Camisa roja",
      color: "rojo",
      talla: "M",
      obligatoria: true,
    },
  ],
  omitidas: [],
  faltantes: [],
  opciones: [],
};

function configurarCargaInicial({
  recetas = [recetaBombero],
  reservas = [],
  tallaRopa = null,
  tallaCalzado = null,
}: {
  recetas?: any[];
  reservas?: any[];
  tallaRopa?: string | null;
  tallaCalzado?: string | null;
} = {}) {
  apiMock.get.mockImplementation((url: string) => {
    if (url === "/a-medida/recetas") {
      return Promise.resolve({
        data: recetas,
      });
    }

    if (url === "/a-medida/reservas") {
      return Promise.resolve({
        data: reservas,
      });
    }

    if (url === "/auth/perfil") {
      return Promise.resolve({
        data: {
          usuario: {
            tallaRopa,
            tallaCalzado,
          },
        },
      });
    }

    return Promise.reject(
      new Error(`GET no simulado: ${url}`)
    );
  });
}

function renderPagina() {
  return render(
    <MemoryRouter>
      <DisfrazAMedida />
    </MemoryRouter>
  );
}

describe("Pruebas funcionales - Disfraz a medida", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    carritoMock.items = [];

    Object.defineProperty(
      window,
      "matchMedia",
      {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: true,
          media: "",
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      }
    );

    Element.prototype.scrollIntoView = vi.fn();
  });

    afterEach(() => {
    vi.useRealTimers();
    });

  it("PF-FE-35: carga y muestra las recetas disponibles para armar un disfraz", async () => {
    configurarCargaInicial();

    renderPagina();

    expect(
      screen.getByRole("heading", {
        name: "Disfraz a medida",
      })
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("button", {
        name: "Bombero",
      })
    ).toBeInTheDocument();

    expect(apiMock.get).toHaveBeenCalledWith(
      "/a-medida/recetas"
    );

    expect(apiMock.get).toHaveBeenCalledWith(
      "/a-medida/reservas"
    );

    expect(apiMock.get).toHaveBeenCalledWith(
      "/auth/perfil"
    );
  });

  it("PF-FE-36: no permite buscar mientras el texto tenga menos de dos caracteres", async () => {
    configurarCargaInicial({
      recetas: [],
    });

    renderPagina();

    const buscar = screen.getByRole("button", {
      name: "Buscar",
    });

    expect(buscar).toBeDisabled();

    fireEvent.change(
      screen.getByLabelText("¿Qué disfraz quieres?"),
      {
        target: {
          value: "b",
        },
      }
    );

    expect(buscar).toBeDisabled();

    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("PF-FE-37: busca un disfraz usando el texto ingresado", async () => {
    configurarCargaInicial({
      recetas: [],
    });

    apiMock.post.mockResolvedValueOnce({
      data: {
        peticionId: "peticion-1",
        resultado: "PARECIDA",
        mensaje: "Encontramos una opción parecida.",
        recetas: [recetaBombero],
        catalogo: [],
      },
    });

    renderPagina();

    fireEvent.change(
      screen.getByLabelText("¿Qué disfraz quieres?"),
      {
        target: {
          value: "  bombero  ",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Buscar",
      })
    );

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith(
        "/a-medida/buscar",
        {
          texto: "bombero",
        }
      );
    });

    expect(
      await screen.findByText(
        "Encontramos una opción parecida."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Bombero",
      })
    ).toBeInTheDocument();
  });

  it("PF-FE-38: muestra el mensaje de error enviado por el backend cuando la búsqueda falla", async () => {
    configurarCargaInicial({
      recetas: [],
    });

    apiMock.post.mockRejectedValueOnce({
      response: {
        data: {
          mensaje:
            "No encontramos una receta compatible",
        },
      },
    });

    renderPagina();

    fireEvent.change(
      screen.getByLabelText("¿Qué disfraz quieres?"),
      {
        target: {
          value: "astronauta",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Buscar",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "No encontramos una receta compatible"
    );
  });

  it("PF-FE-39: permite seleccionar una receta y solicita la talla requerida", async () => {
    configurarCargaInicial();

    renderPagina();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Bombero",
      })
    );

    expect(
      screen.getByRole("heading", {
        name: "Arma tu disfraz de Bombero",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Tu talla de ropa")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Elige tus tallas para ver qué piezas te corresponden."
      )
    ).toBeInTheDocument();
  });

  it("PF-FE-40: utiliza la talla guardada en el perfil como valor inicial", async () => {
    configurarCargaInicial({
      tallaRopa: "M",
    });

    apiMock.post.mockImplementation(
      (url: string) => {
        if (url === "/a-medida/previsualizar") {
          return Promise.resolve({
            data: propuestaCompleta,
          });
        }

        return Promise.reject(
          new Error(`POST no simulado: ${url}`)
        );
      }
    );

    renderPagina();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Bombero",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText("Tu talla de ropa")
      ).toHaveValue("M");
    });
  });

  it("PF-FE-41: permite guardar una nueva talla de ropa en el perfil", async () => {
    configurarCargaInicial({
      tallaRopa: "S",
    });

    apiMock.post.mockImplementation(
      (url: string) => {
        if (url === "/a-medida/previsualizar") {
          return Promise.resolve({
            data: propuestaCompleta,
          });
        }

        return Promise.reject(
          new Error(`POST no simulado: ${url}`)
        );
      }
    );

    apiMock.patch.mockResolvedValue({
      data: {
        usuario: {
          tallaRopa: "M",
          tallaCalzado: null,
        },
      },
    });

    renderPagina();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Bombero",
      })
    );

    fireEvent.change(
      screen.getByLabelText("Tu talla de ropa"),
      {
        target: {
          value: "M",
        },
      }
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Guardar estas tallas en mi perfil",
      })
    );

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith(
        "/auth/perfil/tallas",
        {
          tallaRopa: "M",
          tallaCalzado: undefined,
        }
      );
    });

    expect(
      await screen.findByText(
        "Tallas guardadas en tu perfil."
      )
    ).toBeInTheDocument();
  });

    it("PF-FE-42: calcula y muestra una propuesta cuando se selecciona la talla requerida", async () => {
    configurarCargaInicial();

    apiMock.post.mockImplementation((url: string) => {
        if (url === "/a-medida/previsualizar") {
        return Promise.resolve({
            data: propuestaCompleta,
        });
        }

        return Promise.reject(
        new Error(`POST no simulado: ${url}`)
        );
    });

    renderPagina();

    fireEvent.click(
        await screen.findByRole("button", {
        name: "Bombero",
        })
    );

    fireEvent.change(
        screen.getByLabelText("Tu talla de ropa"),
        {
        target: {
            value: "M",
        },
        }
    );

    await waitFor(
        () => {
        expect(apiMock.post).toHaveBeenCalledWith(
            "/a-medida/previsualizar",
            {
            recetaId: "receta-1",
            tallas: {
                ropa: "M",
            },
            }
        );
        },
        {
        timeout: 1500,
        }
    );

    expect(
        await screen.findByText("Así quedaría tu disfraz")
    ).toBeInTheDocument();

    expect(
        screen.getByText(
        /Camisa roja · rojo · talla M/
        )
    ).toBeInTheDocument();
    });

  it("PF-FE-43: muestra las reservas activas y permite agregarlas nuevamente al carrito", async () => {
    const ahora = Date.now();

    configurarCargaInicial({
      reservas: [
        {
          reservaId: "reserva-1",
          tipo: "A_MEDIDA",
          vence: new Date(
            ahora + 600_000
          ).toISOString(),
          segundosRestantes: 600,
          receta: "Bombero",
          disfraz: {
            id: "disfraz-1",
            nombre: "Bombero personalizado",
            tipoDisfraz: "A_MEDIDA",
            precioDia: 50,
          },
          piezas: [
            {
              id: "fisica-1",
              nombre: "Camisa roja",
              tipo: "CAMISA",
              color: "rojo",
              talla: "M",
            },
          ],
        },
      ],
    });

    renderPagina();

    expect(
      await screen.findByText(
        "Tus reservas sin pagar (1 de 3)"
      )
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar al carrito",
      })
    );

    expect(
      carritoMock.agregarItem
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        disfrazFisicoId: "disfraz-1",
        nombre: "Bombero personalizado",
        reservaId: "reserva-1",
        precioAlquiler: 50,
      })
    );
  });

  it("PF-FE-44: permite cancelar una reserva activa y quitarla del carrito", async () => {
    configurarCargaInicial({
      reservas: [
        {
          reservaId: "reserva-2",
          tipo: "A_MEDIDA",
          vence: new Date(
            Date.now() + 600_000
          ).toISOString(),
          segundosRestantes: 600,
          receta: "Bombero",
          disfraz: {
            id: "disfraz-2",
            nombre: "Bombero reservado",
            tipoDisfraz: "A_MEDIDA",
            precioDia: 50,
          },
          piezas: [],
        },
      ],
    });

    apiMock.delete.mockResolvedValue({});

    renderPagina();

    const cancelar =
      await screen.findByRole("button", {
        name: "Cancelar reserva",
      });

    fireEvent.click(cancelar);

    await waitFor(() => {
      expect(apiMock.delete).toHaveBeenCalledWith(
        "/a-medida/reservas/reserva-2"
      );
    });

    expect(
      carritoMock.quitarItem
    ).toHaveBeenCalledWith("disfraz-2");
  });
});