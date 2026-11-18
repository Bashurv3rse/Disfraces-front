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
import { within } from "@testing-library/react";

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
  disfraces: Array<Record<string, unknown>> = [disfrazDisponible]
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

async function abrirDetalle(user: ReturnType<typeof userEvent.setup>, nombre: string) {
  await screen.findByRole("heading", { name: nombre });
  await user.click(screen.getByRole("button", { name: "Ver detalle" }));
  return screen.findByRole("dialog");
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

    // La ficha de la tarjeta es corta: las piezas se ven recién en el detalle.
    expect(screen.queryByText("Capa · Negro · M")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver detalle" })
    ).toBeInTheDocument();
  });

  it("PF-FE-08: agrega un disfraz disponible al carrito", async () => {
    const user = userEvent.setup();

    configurarApiCatalogo();

    renderizarCatalogo();

    const detalle = await abrirDetalle(user, "Batman");

    await user.click(
      within(detalle).getByRole("button", {
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

    const user = userEvent.setup();
    expect(await screen.findByText("Incompleto")).toBeInTheDocument();

    const detalle = await abrirDetalle(user, "Pirata");

    expect(
      within(detalle).getByRole("button", {
        name: "Agregar al carrito",
      })
    ).toBeDisabled();

    expect(within(detalle).queryByRole("button", { name: "Ajustar a mi talla" })).not.toBeInTheDocument();
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

    const user = userEvent.setup();
    configurarApiCatalogo();

    renderizarCatalogo();

    const detalle = await abrirDetalle(user, "Batman");

    expect(
      within(detalle).getByRole("button", {
        name: "En el carrito",
      })
    ).toBeDisabled();

    expect(within(detalle).queryByRole("button", { name: "Ajustar a mi talla" })).not.toBeInTheDocument();

    expect(
      agregarItemMock
    ).not.toHaveBeenCalled();
  });

  it("PF-FE-11: un usuario no autenticado recibe la opción de iniciar sesión para alquilar", async () => {
    usuarioMock = null;
    const user = userEvent.setup();

    configurarApiCatalogo();

    renderizarCatalogo();

    const detalle = await abrirDetalle(user, "Batman");

    const enlace = within(detalle).getByRole("link", {
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

  it("PF-FE-15: agrupa en una sola tarjeta los disfraces iguales de distinta talla", async () => {
    const variante = (id: string, ropa: string, calzado: string, estado = "DISPONIBLE") => ({
      ...disfrazDisponible,
      id,
      familia: "Batman",
      estado,
      prendasHogar: [
        { id: `${id}-c`, nombre: "Capa", tipo: "ACCESORIO", color: "Negro", talla: "única", estado: "DISPONIBLE" },
        { id: `${id}-p`, nombre: "Camisa", tipo: "CAMISA", color: "Negro", talla: ropa, estado: "DISPONIBLE" },
        { id: `${id}-z`, nombre: "Botas", tipo: "ZAPATO", color: "Negro", talla: calzado, estado: "DISPONIBLE" },
      ],
    });
    configurarApiCatalogo([variante("b-s", "S", "37"), variante("b-m", "M", "39"), variante("b-l", "L", "41", "ALQUILADO")]);
    const user = userEvent.setup();

    renderizarCatalogo();

    await screen.findByRole("heading", { name: "Batman" });
    expect(screen.getAllByRole("button", { name: "Ver detalle" })).toHaveLength(1);

    const detalle = await abrirDetalle(user, "Batman");
    const ropa = within(detalle).getByLabelText("Talla de ropa");
    const calzado = within(detalle).getByLabelText("Talla de calzado");
    expect(within(ropa).getAllByRole("option").map((o) => o.textContent)).toEqual(["S", "M", "L"]);

    // Elegir la combinación M + 39 selecciona esa unidad y la agrega al carrito.
    await user.selectOptions(ropa, "M");
    await user.selectOptions(calzado, "39");
    await user.click(within(detalle).getByRole("button", { name: "Agregar al carrito" }));
    expect(agregarItemMock).toHaveBeenCalledWith(expect.objectContaining({ disfrazFisicoId: "b-m" }));
  });

  it("PF-FE-16: una talla ocupada hoy se puede agregar: las fechas se validan en el carrito", async () => {
    const mk = (id: string, talla: string, estado: string) => ({
      ...disfrazDisponible,
      id,
      familia: "Batman",
      estado,
      prendasHogar: [{ id: `${id}-p`, nombre: "Camisa", tipo: "CAMISA", color: "Negro", talla, estado: "DISPONIBLE" }],
    });
    configurarApiCatalogo([mk("b-s", "S", "DISPONIBLE"), mk("b-m", "M", "ALQUILADO")]);
    const user = userEvent.setup();

    renderizarCatalogo();
    const detalle = await abrirDetalle(user, "Batman");
    await user.selectOptions(within(detalle).getByLabelText("Talla de ropa"), "M");

    expect(within(detalle).getByText(/Ocupado hoy/)).toBeInTheDocument();
    expect(within(detalle).getByRole("button", { name: "Agregar al carrito" })).toBeEnabled();
  });

  it("PF-FE-17: el catálogo ya no tiene filtro de fechas", async () => {
    configurarApiCatalogo();
    renderizarCatalogo();
    await screen.findByRole("heading", { name: "Batman" });
    expect(screen.queryByLabelText("Desde")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Hasta")).not.toBeInTheDocument();
  });

  it("PF-FE-18: 'Ver disponibilidad' muestra el calendario con días libres y ocupados", async () => {
    configurarApiCatalogo([
      { ...disfrazDisponible, ocupaciones: [{ desde: "2000-01-01", hasta: "2099-12-31" }] },
    ]);
    const user = userEvent.setup();

    renderizarCatalogo();
    const detalle = await abrirDetalle(user, "Batman");
    expect(within(detalle).queryByRole("group", { name: "Calendario de disponibilidad" })).not.toBeInTheDocument();

    await user.click(within(detalle).getByRole("button", { name: "Ver disponibilidad" }));
    const calendario = within(detalle).getByRole("group", { name: "Calendario de disponibilidad" });
    expect(within(calendario).getAllByLabelText(/: ocupado$/).length).toBeGreaterThan(0);
    expect(within(calendario).queryAllByLabelText(/: libre$/)).toHaveLength(0);
  });

  it("PF-FE-19: sin ocupaciones los días futuros salen libres", async () => {
    configurarApiCatalogo([{ ...disfrazDisponible, ocupaciones: [] }]);
    const user = userEvent.setup();

    renderizarCatalogo();
    const detalle = await abrirDetalle(user, "Batman");
    await user.click(within(detalle).getByRole("button", { name: "Ver disponibilidad" }));
    await user.click(within(detalle).getByRole("button", { name: "Mes siguiente" }));
    const calendario = within(detalle).getByRole("group", { name: "Calendario de disponibilidad" });
    expect(within(calendario).getAllByLabelText(/: libre$/).length).toBeGreaterThan(27);
  });

  it("PF-FE-20: un disfraz incompleto muestra todo el calendario como ocupado", async () => {
    configurarApiCatalogo([{ ...disfrazNoDisponible, ocupaciones: [], bloqueo: "INCOMPLETO" }]);
    const user = userEvent.setup();

    renderizarCatalogo();
    const detalle = await abrirDetalle(user, "Pirata");
    await user.click(within(detalle).getByRole("button", { name: "Ver disponibilidad" }));
    expect(within(detalle).getAllByText(/le faltan piezas/).length).toBeGreaterThan(0);
    expect(within(detalle).queryAllByLabelText(/: libre$/)).toHaveLength(0);
  });

  it("PF-FE-21: cualquier talla de ropa muestra todos los calzados disponibles", async () => {
    const mk = (id: string, ropa: string, calzado: string) => ({
      ...disfrazDisponible,
      id,
      familia: "Batman",
      prendasHogar: [
        { id: `${id}-p`, nombre: "Camisa", tipo: "CAMISA", color: "Negro", talla: ropa, estado: "DISPONIBLE" },
        { id: `${id}-z`, nombre: "Botas", tipo: "ZAPATO", color: "Negro", talla: calzado, estado: "DISPONIBLE" },
      ],
    });
    const todas = [];
    for (const r of ["S", "M", "L", "XL"]) for (const c of ["36", "37", "38", "43"]) todas.push(mk(`${r}-${c}`, r, c));
    configurarApiCatalogo(todas);
    const user = userEvent.setup();

    renderizarCatalogo();
    const detalle = await abrirDetalle(user, "Batman");
    const ropa = within(detalle).getByLabelText("Talla de ropa");
    const calzado = within(detalle).getByLabelText("Talla de calzado");

    for (const r of ["S", "M", "L", "XL"]) {
      await user.selectOptions(ropa, r);
      expect(within(calzado).getAllByRole("option").map((o) => o.textContent)).toEqual(["36", "37", "38", "43"]);
    }

    // L + 38 agrega justamente esa unidad, con sus tallas.
    await user.selectOptions(ropa, "L");
    await user.selectOptions(calzado, "38");
    await user.click(within(detalle).getByRole("button", { name: "Agregar al carrito" }));
    expect(agregarItemMock).toHaveBeenCalledWith(
      expect.objectContaining({ disfrazFisicoId: "L-38", tallaRopa: "L", tallaCalzado: "38" })
    );
  });

  it("PF-FE-22: si el perfil tiene tallas, el detalle se abre ya con ellas elegidas", async () => {
    const mk = (id: string, ropa: string, calzado: string) => ({
      ...disfrazDisponible,
      id,
      familia: "Batman",
      prendasHogar: [
        { id: `${id}-p`, nombre: "Camisa", tipo: "CAMISA", color: "Negro", talla: ropa, estado: "DISPONIBLE" },
        { id: `${id}-z`, nombre: "Botas", tipo: "ZAPATO", color: "Negro", talla: calzado, estado: "DISPONIBLE" },
      ],
    });
    configurarApiCatalogo([mk("a", "S", "36"), mk("b", "M", "37"), mk("c", "L", "38"), mk("d", "XL", "43")]);
    const get = api.get as unknown as { getMockImplementation: () => ((...args: any[]) => any) | undefined; mockImplementation: (fn: (...args: any[]) => any) => void };
    const base = get.getMockImplementation()!;
    get.mockImplementation((url: string, ...resto: unknown[]) =>
      url === "/auth/perfil" ? Promise.resolve({ data: { usuario: { tallaRopa: "L", tallaCalzado: "38" } } }) : base(url, ...resto)
    );
    const user = userEvent.setup();

    renderizarCatalogo();
    const detalle = await abrirDetalle(user, "Batman");

    await waitFor(() => expect((within(detalle).getByLabelText("Talla de ropa") as HTMLSelectElement).value).toBe("L"));
    expect((within(detalle).getByLabelText("Talla de calzado") as HTMLSelectElement).value).toBe("38");
    expect(within(detalle).getByText(/tallas que guardaste en tu perfil/)).toBeInTheDocument();
    await user.click(within(detalle).getByRole("button", { name: "Agregar al carrito" }));
    expect(agregarItemMock).toHaveBeenCalledWith(expect.objectContaining({ disfrazFisicoId: "c" }));
  });

  it("PF-FE-23: los filtros muestran cuántos hay activos y se pueden limpiar", async () => {
    configurarApiCatalogo();
    const user = userEvent.setup();
    renderizarCatalogo();
    await screen.findByRole("heading", { name: "Batman" });

    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Buscar"), "bat");
    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe("");
  });
});