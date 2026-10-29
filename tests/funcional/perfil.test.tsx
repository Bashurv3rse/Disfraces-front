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
  patch: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  actualizarUsuario: vi.fn(),
}));

const establecerAccessTokenMock =
  vi.hoisted(() => vi.fn());

vi.mock("../../src/lib/api", () => ({
  api: apiMock,
  establecerAccessToken:
    establecerAccessTokenMock,
}));

vi.mock("../../src/lib/AuthContext", () => ({
  useAuth: () => authMock,
}));

import Perfil from "../../src/pages/perfil/Perfil";

const perfilBase = {
  id: "usuario-1",
  nombre: "Mauro Prueba",
  email: "mauro@test.com",
  telefono: "999888777",
  direccion: "Av. Prueba 123",
  tallaRopa: "M",
  tallaCalzado: "40",
  rol: "CLIENTE",
  creadoEn: "2026-01-10T00:00:00.000Z",
};

function renderPagina() {
  return render(<Perfil />);
}

describe("Pruebas funcionales - Perfil", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMock.get.mockResolvedValue({
      data: {
        usuario: perfilBase,
      },
    });
  });

  it("PF-FE-74: carga y muestra los datos del perfil del usuario", async () => {
    renderPagina();

    expect(
      screen.getByRole("status")
    ).toHaveTextContent(
      "Cargando tu perfil…"
    );

    expect(
      await screen.findByRole("heading", {
        name: "Mi perfil",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Nombre")
    ).toHaveValue("Mauro Prueba");

    expect(
      screen.getByLabelText(
        "Correo electrónico"
      )
    ).toHaveValue("mauro@test.com");

    expect(
      screen.getByLabelText("Teléfono")
    ).toHaveValue("999888777");

    expect(
      screen.getByLabelText(
        "Dirección principal"
      )
    ).toHaveValue("Av. Prueba 123");

    expect(
      screen.getByText("Cliente")
    ).toBeInTheDocument();

    expect(apiMock.get).toHaveBeenCalledWith(
      "/auth/perfil"
    );
  });

  it("PF-FE-75: permite modificar los datos personales y actualiza el usuario de la sesión", async () => {
    const perfilActualizado = {
      ...perfilBase,
      nombre: "Mauro Actualizado",
      telefono: "987654321",
    };

    apiMock.patch.mockResolvedValue({
      data: {
        usuario: perfilActualizado,
      },
    });

    renderPagina();

    const nombre =
      await screen.findByLabelText("Nombre");

    fireEvent.change(nombre, {
      target: {
        value: "Mauro Actualizado",
      },
    });

    fireEvent.change(
      screen.getByLabelText("Teléfono"),
      {
        target: {
          value: "987654321",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Guardar cambios",
      })
    );

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith(
        "/auth/perfil",
        {
          nombre: "Mauro Actualizado",
          telefono: "987654321",
          direccion: "Av. Prueba 123",
        }
      );
    });

    expect(
      authMock.actualizarUsuario
    ).toHaveBeenCalledWith(
      perfilActualizado
    );

    expect(
      await screen.findByText(
        "Datos actualizados correctamente."
      )
    ).toBeInTheDocument();
  });

  it("PF-FE-76: impide cambiar la contraseña cuando la confirmación no coincide", async () => {
    renderPagina();

    await screen.findByRole("heading", {
      name: "Mi perfil",
    });

    fireEvent.change(
      screen.getByLabelText(
        "Contraseña actual"
      ),
      {
        target: {
          value: "Actual123!",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        "Contraseña nueva"
      ),
      {
        target: {
          value: "Nueva123!",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        "Confirmar contraseña nueva"
      ),
      {
        target: {
          value: "Otra123!",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cambiar contraseña",
      })
    );

    expect(
      await screen.findByText(
        "Las contraseñas no coinciden"
      )
    ).toBeInTheDocument();

    expect(apiMock.patch).not.toHaveBeenCalled();
  });

  it("PF-FE-77: cambia correctamente la contraseña y guarda el nuevo access token", async () => {
    apiMock.patch.mockResolvedValue({
      data: {
        accessToken: "nuevo-access-token",
      },
    });

    renderPagina();

    await screen.findByRole("heading", {
      name: "Mi perfil",
    });

    fireEvent.change(
      screen.getByLabelText(
        "Contraseña actual"
      ),
      {
        target: {
          value: "Actual123!",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        "Contraseña nueva"
      ),
      {
        target: {
          value: "Nueva123!",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText(
        "Confirmar contraseña nueva"
      ),
      {
        target: {
          value: "Nueva123!",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cambiar contraseña",
      })
    );

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith(
        "/auth/perfil/password",
        {
          passwordActual: "Actual123!",
          passwordNueva: "Nueva123!",
        }
      );
    });

    expect(
      establecerAccessTokenMock
    ).toHaveBeenCalledWith(
      "nuevo-access-token"
    );

    expect(
      await screen.findByText(
        "Contraseña actualizada. Se cerraron tus otras sesiones."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(
        "Contraseña actual"
      )
    ).toHaveValue("");

    expect(
      screen.getByLabelText(
        "Contraseña nueva"
      )
    ).toHaveValue("");
  });

  it("PF-FE-78: permite actualizar las tallas guardadas del usuario", async () => {
    const perfilConTallas = {
      ...perfilBase,
      tallaRopa: "L",
      tallaCalzado: "42",
    };

    apiMock.patch.mockResolvedValue({
      data: {
        usuario: perfilConTallas,
      },
    });

    renderPagina();

    const ropa =
      await screen.findByLabelText(
        "Talla de ropa"
      );

    const calzado =
      screen.getByLabelText(
        "Talla de calzado"
      );

    expect(ropa).toHaveValue("M");
    expect(calzado).toHaveValue("40");

    fireEvent.change(ropa, {
      target: {
        value: "L",
      },
    });

    fireEvent.change(calzado, {
      target: {
        value: "42",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Guardar tallas",
      })
    );

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith(
        "/auth/perfil/tallas",
        {
          tallaRopa: "L",
          tallaCalzado: "42",
        }
      );
    });

    expect(
      await screen.findByText(
        "Tallas guardadas."
      )
    ).toBeInTheDocument();

    expect(ropa).toHaveValue("L");
    expect(calzado).toHaveValue("42");
  });
});