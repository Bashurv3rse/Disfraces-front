import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  guardarSesion: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/lib/api", () => ({
  api: apiMock,
}));

vi.mock("../../src/lib/AuthContext", () => ({
  useAuth: () => authMock,
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom"
    );

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import Registro from "../../src/pages/auth/Registro";

function renderRegistro() {
  return render(
    <MemoryRouter>
      <Registro />
    </MemoryRouter>
  );
}

function completarFormulario() {
  fireEvent.change(
    screen.getByLabelText("Nombre"),
    {
      target: {
        value: "Mauro Atavillos",
      },
    }
  );

  fireEvent.change(
    screen.getByLabelText("Correo electrónico"),
    {
      target: {
        value: "mauro@example.com",
      },
    }
  );

  fireEvent.change(
    screen.getByLabelText("Teléfono"),
    {
      target: {
        value: "987654321",
      },
    }
  );

  fireEvent.change(
    screen.getByLabelText("Dirección principal"),
    {
      target: {
        value: "Av. Principal 123",
      },
    }
  );

  fireEvent.change(
    screen.getByLabelText("Contraseña"),
    {
      target: {
        value: "Clave123!",
      },
    }
  );
}

describe("Pruebas funcionales - Registro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PF-FE-15: muestra todos los campos necesarios para crear una cuenta", () => {
    renderRegistro();

    expect(
      screen.getByRole("heading", {
        name: "Crear cuenta",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Nombre")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Correo electrónico")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Teléfono")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Dirección principal")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Contraseña")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Crear cuenta",
      })
    ).toBeInTheDocument();
  });

  it("PF-FE-16: envía correctamente los datos ingresados al backend", async () => {
    apiMock.post.mockResolvedValue({
      data: {
        usuario: {
          id: "usuario-1",
          nombre: "Mauro Atavillos",
          email: "mauro@example.com",
          rol: "CLIENTE",
        },

        accessToken: "token-prueba",
      },
    });

    renderRegistro();
    completarFormulario();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Crear cuenta",
      })
    );

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith(
        "/auth/registro",
        {
          nombre: "Mauro Atavillos",
          email: "mauro@example.com",
          password: "Clave123!",
          telefono: "987654321",
          direccion: "Av. Principal 123",
        }
      );
    });
  });

  it("PF-FE-17: guarda la sesión y navega al catálogo después de un registro exitoso", async () => {
    const usuario = {
      id: "usuario-1",
      nombre: "Mauro Atavillos",
      email: "mauro@example.com",
      rol: "CLIENTE",
    };

    apiMock.post.mockResolvedValue({
      data: {
        usuario,
        accessToken: "token-prueba",
      },
    });

    renderRegistro();
    completarFormulario();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Crear cuenta",
      })
    );

    await waitFor(() => {
      expect(
        authMock.guardarSesion
      ).toHaveBeenCalledWith(
        usuario,
        "token-prueba"
      );

      expect(navigateMock).toHaveBeenCalledWith(
        "/catalogo"
      );
    });
  });

  it("PF-FE-18: muestra los errores de validación enviados por el backend en sus campos correspondientes", async () => {
    apiMock.post.mockRejectedValue({
      response: {
        data: {
          errores: {
            nombre: [
              "El nombre es obligatorio",
            ],

            email: [
              "Correo electrónico inválido",
            ],

            telefono: [
              "Teléfono inválido",
            ],

            direccion: [
              "La dirección es obligatoria",
            ],

            password: [
              "La contraseña debe tener al menos 8 caracteres",
            ],
          },
        },
      },
    });

    renderRegistro();
    completarFormulario();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Crear cuenta",
      })
    );

    expect(
      await screen.findByText(
        "El nombre es obligatorio"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Correo electrónico inválido"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText("Teléfono inválido")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "La dirección es obligatoria"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "La contraseña debe tener al menos 8 caracteres"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Nombre")
    ).toHaveAttribute("aria-invalid", "true");

    expect(
      screen.getByLabelText("Correo electrónico")
    ).toHaveAttribute("aria-invalid", "true");
  });

  it("PF-FE-19: muestra el mensaje general devuelto por el backend cuando el registro falla", async () => {
    apiMock.post.mockRejectedValue({
      response: {
        data: {
          mensaje:
            "El correo electrónico ya está registrado",
        },
      },
    });

    renderRegistro();
    completarFormulario();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Crear cuenta",
      })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "El correo electrónico ya está registrado"
    );

    expect(
      authMock.guardarSesion
    ).not.toHaveBeenCalled();

    expect(
      navigateMock
    ).not.toHaveBeenCalled();
  });

  it("PF-FE-20: deshabilita el botón y muestra retroalimentación mientras se procesa el registro", async () => {
    let resolverPeticion:
      | ((valor: unknown) => void)
      | undefined;

    apiMock.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolverPeticion = resolve;
        })
    );

    renderRegistro();
    completarFormulario();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Crear cuenta",
      })
    );

    const botonProcesando =
      await screen.findByRole("button", {
        name: "Creando cuenta…",
      });

    expect(
      botonProcesando
    ).toBeDisabled();

    resolverPeticion?.({
      data: {
        usuario: {
          id: "usuario-1",
          nombre: "Mauro Atavillos",
          rol: "CLIENTE",
        },

        accessToken: "token-prueba",
      },
    });

    await waitFor(() => {
      expect(
        navigateMock
      ).toHaveBeenCalledWith("/catalogo");
    });
  });
});