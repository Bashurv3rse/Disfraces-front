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
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Login from "../../src/pages/auth/Login";
import { api } from "../../src/lib/api";

const navigateMock = vi.fn();
const guardarSesionMock = vi.fn();

vi.mock("../../src/lib/AuthContext", () => ({
  useAuth: () => ({
    usuario: null,
    cargandoSesion: false,
    guardarSesion: guardarSesionMock,
    actualizarUsuario: vi.fn(),
    cerrarSesion: vi.fn(),
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderizarLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
});

describe("Pruebas funcionales - Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PF-FE-01: muestra los campos principales del formulario de inicio de sesión", () => {
    renderizarLogin();

    expect(
      screen.getByRole("heading", {
        name: "Iniciar sesión",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Correo electrónico")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Contraseña")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Ingresar",
      })
    ).toBeInTheDocument();
  });

  it("PF-FE-02: un cliente con credenciales válidas inicia sesión y es dirigido al catálogo", async () => {
    const user = userEvent.setup();

    vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        usuario: {
          id: "cliente-1",
          nombre: "Cliente Prueba",
          email: "cliente@test.com",
          rol: "CLIENTE",
        },
        accessToken: "token-cliente",
      },
    });

    renderizarLogin();

    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "cliente@test.com"
    );

    await user.type(
      screen.getByLabelText("Contraseña"),
      "Password123!"
    );

    await user.click(
      screen.getByRole("button", {
        name: "Ingresar",
      })
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/auth/login",
        {
          email: "cliente@test.com",
          password: "Password123!",
        }
      );
    });

    expect(guardarSesionMock).toHaveBeenCalledWith(
      {
        id: "cliente-1",
        nombre: "Cliente Prueba",
        email: "cliente@test.com",
        rol: "CLIENTE",
      },
      "token-cliente"
    );

    expect(navigateMock).toHaveBeenCalledWith(
      "/catalogo"
    );
  });

  it("PF-FE-03: un administrador con credenciales válidas es dirigido al dashboard administrativo", async () => {
    const user = userEvent.setup();

    vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        usuario: {
          id: "admin-1",
          nombre: "Administrador",
          email: "admin@test.com",
          rol: "ADMINISTRADOR",
        },
        accessToken: "token-admin",
      },
    });

    renderizarLogin();

    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "admin@test.com"
    );

    await user.type(
      screen.getByLabelText("Contraseña"),
      "Admin123!"
    );

    await user.click(
      screen.getByRole("button", {
        name: "Ingresar",
      })
    );

    await waitFor(() => {
      expect(guardarSesionMock).toHaveBeenCalled();
    });

    expect(navigateMock).toHaveBeenCalledWith(
      "/admin/dashboard"
    );
  });

  it("PF-FE-04: muestra el mensaje enviado por el backend cuando las credenciales son incorrectas", async () => {
    const user = userEvent.setup();

    vi.spyOn(api, "post").mockRejectedValueOnce({
      response: {
        data: {
          mensaje: "Credenciales incorrectas",
        },
      },
    });

    renderizarLogin();

    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "incorrecto@test.com"
    );

    await user.type(
      screen.getByLabelText("Contraseña"),
      "Incorrecta123!"
    );

    await user.click(
      screen.getByRole("button", {
        name: "Ingresar",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Credenciales incorrectas"
    );

    expect(guardarSesionMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("PF-FE-05: muestra un mensaje genérico cuando el backend no devuelve un mensaje de error", async () => {
    const user = userEvent.setup();

    vi.spyOn(api, "post").mockRejectedValueOnce(
      new Error("Error de red")
    );

    renderizarLogin();

    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "cliente@test.com"
    );

    await user.type(
      screen.getByLabelText("Contraseña"),
      "Password123!"
    );

    await user.click(
      screen.getByRole("button", {
        name: "Ingresar",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "No se pudo iniciar sesión"
    );

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("PF-FE-06: deshabilita el botón mientras se procesa el inicio de sesión", async () => {
    let resolverPeticion:
      | ((valor: {
          data: {
            usuario: {
              id: string;
              nombre: string;
              email: string;
              rol: "CLIENTE";
            };
            accessToken: string;
          };
        }) => void)
      | undefined;

    vi.spyOn(api, "post").mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolverPeticion = resolve;
        })
    );

    renderizarLogin();

    fireEvent.change(
      screen.getByLabelText("Correo electrónico"),
      {
        target: {
          value: "cliente@test.com",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Contraseña"),
      {
        target: {
          value: "Password123!",
        },
      }
    );

    fireEvent.submit(
      screen
        .getByRole("button", {
          name: "Ingresar",
        })
        .closest("form")!
    );

    const botonCargando = await screen.findByRole(
      "button",
      {
        name: "Ingresando…",
      }
    );

    expect(botonCargando).toBeDisabled();

    resolverPeticion?.({
      data: {
        usuario: {
          id: "cliente-1",
          nombre: "Cliente Prueba",
          email: "cliente@test.com",
          rol: "CLIENTE",
        },
        accessToken: "token-cliente",
      },
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        "/catalogo"
      );
    });
  });
});