import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Catalogo from "../../src/pages/catalogo/Catalogo";
import { api } from "../../src/lib/api";

const agregarItemMock = vi.fn();

let usuarioMock: {
  id: string;
  nombre: string;
  email: string;
  rol: "CLIENTE" | "ADMINISTRADOR" | "PROVEEDOR";
} | null = {
  id: "cliente-1",
  nombre: "Cliente Prueba",
  email: "cliente@test.com",
  rol: "CLIENTE",
};

let itemsMock: Array<{
  disfrazFisicoId: string;
  nombre: string;
  tipoDisfraz: string;
  precioAlquiler: number;
}> = [];

vi.mock("../../src/lib/AuthContext", () => ({
  useAuth: () => ({
    usuario: usuarioMock,
    cargandoSesion: false,
    guardarSesion: vi.fn(),
    actualizarUsuario: vi.fn(),
    cerrarSesion: vi.fn(),
  }),
}));

vi.mock("../../src/lib/CarritoContext", () => ({
  useCarrito: () => ({
    items: itemsMock,
    agregarItem: agregarItemMock,
    quitarItem: vi.fn(),
    vaciarCarrito: vi.fn(),
    totalPorDia: 0,
    abierto: false,
    abrirCarrito: vi.fn(),
    cerrarCarrito: vi.fn(),
    aviso: null,
    descartarAviso: vi.fn(),
  }),
}));

vi.mock("../../src/components/OfertasBanner", () => ({
  OfertasBanner: () => (
    <div data-testid="ofertas-banner">
      Ofertas
    </div>
  ),
}));

vi.mock("../../src/components/AjusteTallaModal", () => ({
  AjusteTallaModal: ({
    nombre,
    onCerrar,
  }: {
    nombre: string;
    onCerrar: () => void;
  }) => (
    <div role="dialog">
      <span>Ajustando {nombre}</span>
      <button type="button" onClick={onCerrar}>
        Cerrar
      </button>
    </div>
  ),
}));

const disfrazDisponible = {
  id: "disfraz-1",
  nombre: "Batman",
  tipoDisfraz: "TRADICIONAL",
  temporadaEvento: "HALLOWEEN",
  precioAlquiler: "40",
  imagenUrl: null,
  estado: "DISPONIBLE",
  prendasHogar: [
    {
      id: "prenda-1",
      nombre: "Capa",
      tipo: "ACCESORIO",
      color: "Negro",
      talla: "M",
      estado: "DISPONIBLE",
    },
  ],
};

const disfrazNoDisponible = {
  id: "disfraz-2",
  nombre: "Pirata",
  tipoDisfraz: "TRADICIONAL",
  temporadaEvento: "HALLOWEEN",
  precioAlquiler: "35",
  imagenUrl: null,
  estado: "INCOMPLETO",
  prendasHogar: [
    {
      id: "prenda-2",
      nombre: "Camisa",
      tipo: "CAMISA",
      color: "Blanco",
      talla: "M",
      estado: "DISPONIBLE",
    },
  ],
};

function configurarApiCatalogo(
  disfraces = [disfrazDisponible]
) {
  vi.spyOn(api, "get").mockImplementation(
    async (url) => {
      if (url === "/disfraces/temporadas") {
        return {
          data: ["HALLOWEEN", "NAVIDAD"],
        };
      }

      if (url === "/disfraces/tipos") {
        return {
          data: ["TRADICIONAL", "TEMATICO"],
        };
      }

      if (url === "/disfraces") {
        return {
          data: disfraces,
        };
      }

      throw new Error(
        `Endpoint no simulado: ${url}`
      );
    }
  );
}

function renderizarCatalogo() {
  return render(
    <MemoryRouter>
      <Catalogo />
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Pruebas funcionales - Catálogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    usuarioMock = {
      id: "cliente-1",
      nombre: "Cliente Prueba",
      email: "cliente@test.com",
      rol: "CLIENTE",
    };

    itemsMock = [];
  });

  it("PF-FE-07: carga y muestra los disfraces obtenidos desde la API", async () => {
    configurarApiCatalogo();

    renderizarCatalogo();

    expect(
      screen.getByRole("status")
    ).toHaveTextContent(
      "Cargando disfraces…"
    );

    expect(
      await screen.findByRole("heading", {
        name: "Batman",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "TRADICIONAL · Temporada: HALLOWEEN"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText("S/ 40 / día")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Disponible")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Capa · Negro · M")
    ).toBeInTheDocument();
  });

  it("PF-FE-08: agrega un disfraz disponible al carrito", async () => {
    const user = userEvent.setup();

    configurarApiCatalogo();

    renderizarCatalogo();

    await screen.findByRole("heading", {
      name: "Batman",
    });

    await user.click(
      screen.getByRole("button", {
        name: "Agregar al carrito",
      })
    );

    expect(agregarItemMock).toHaveBeenCalledTimes(1);

    expect(agregarItemMock).toHaveBeenCalledWith({
      disfrazFisicoId: "disfraz-1",
      nombre: "Batman",
      tipoDisfraz: "TRADICIONAL",
      precioAlquiler: 40,
    });
  });

  it("PF-FE-09: impide agregar un disfraz que no está disponible", async () => {
    configurarApiCatalogo([
      disfrazNoDisponible,
    ]);

    renderizarCatalogo();

    await screen.findByRole("heading", {
      name: "Pirata",
    });

    expect(
      screen.getByRole("button", {
        name: "Agregar al carrito",
      })
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Ajustar a mi talla",
      })
    ).toBeDisabled();

    expect(
      screen.getByText("Incompleto")
    ).toBeInTheDocument();
  });

  it("PF-FE-10: un disfraz que ya está en el carrito no puede agregarse nuevamente", async () => {
    itemsMock = [
      {
        disfrazFisicoId: "disfraz-1",
        nombre: "Batman",
        tipoDisfraz: "TRADICIONAL",
        precioAlquiler: 40,
      },
    ];

    configurarApiCatalogo();

    renderizarCatalogo();

    await screen.findByRole("heading", {
      name: "Batman",
    });

    expect(
      screen.getByRole("button", {
        name: "En el carrito",
      })
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Ajustar a mi talla",
      })
    ).toBeDisabled();

    expect(
      agregarItemMock
    ).not.toHaveBeenCalled();
  });

  it("PF-FE-11: un usuario no autenticado recibe la opción de iniciar sesión para alquilar", async () => {
    usuarioMock = null;

    configurarApiCatalogo();

    renderizarCatalogo();

    await screen.findByRole("heading", {
      name: "Batman",
    });

    const enlace = screen.getByRole("link", {
      name: "Inicia sesión para alquilar",
    });

    expect(enlace).toBeInTheDocument();

    expect(enlace).toHaveAttribute(
      "href",
      "/login"
    );

    expect(
      screen.queryByRole("button", {
        name: "Agregar al carrito",
      })
    ).not.toBeInTheDocument();
  });

  it("PF-FE-12: muestra un mensaje cuando la API no devuelve disfraces", async () => {
    configurarApiCatalogo([]);

    renderizarCatalogo();

    expect(
      await screen.findByText(
        "No se encontraron disfraces con estos filtros."
      )
    ).toBeInTheDocument();
  });

  it("PF-FE-13: la búsqueda vuelve a consultar el catálogo con el nombre ingresado", async () => {
    const user = userEvent.setup();

    configurarApiCatalogo();

    renderizarCatalogo();

    await screen.findByRole("heading", {
      name: "Batman",
    });

    const buscador =
      screen.getByLabelText("Buscar");

    await user.type(
      buscador,
      "Batman"
    );

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith(
          "/disfraces",
          {
            params: {
              nombre: "Batman",
            },
          }
        );
      },
      {
        timeout: 2000,
      }
    );
  });

  it("PF-FE-14: filtra el catálogo por tipo de disfraz", async () => {
    const user = userEvent.setup();

    configurarApiCatalogo();

    renderizarCatalogo();

    await screen.findByRole("heading", {
      name: "Batman",
    });

    await user.click(
      screen.getByRole("checkbox", {
        name: "TRADICIONAL",
      })
    );

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith(
          "/disfraces",
          {
            params: {
              tipos: "TRADICIONAL",
            },
          }
        );
      },
      {
        timeout: 2000,
      }
    );

    expect(
      screen.getByRole("button", {
        name: "Limpiar filtros",
      })
    ).toBeInTheDocument();
  });
});