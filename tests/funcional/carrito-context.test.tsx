import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CarritoProvider,
  useCarrito,
  type ItemCarrito,
} from "../../src/lib/CarritoContext";

const disfraz1: ItemCarrito = {
  disfrazFisicoId: "disfraz-1",
  nombre: "Pirata",
  tipoDisfraz: "TEMATICO",
  precioAlquiler: 40,
};

const disfraz2: ItemCarrito = {
  disfrazFisicoId: "disfraz-2",
  nombre: "Princesa",
  tipoDisfraz: "TEMATICO",
  precioAlquiler: 60,
};

function ConsumidorCarrito() {
  const {
    items,
    agregarItem,
    quitarItem,
    vaciarCarrito,
    totalPorDia,
    abierto,
    abrirCarrito,
    cerrarCarrito,
    aviso,
    descartarAviso,
  } = useCarrito();

  return (
    <div>
      <span data-testid="cantidad">{items.length}</span>
      <span data-testid="total">{totalPorDia}</span>
      <span data-testid="estado">
        {abierto ? "abierto" : "cerrado"}
      </span>

      <span data-testid="nombres">
        {items.map((item) => item.nombre).join(",")}
      </span>

      {aviso && (
        <div role="alert">
          {aviso}
        </div>
      )}

      <button
        onClick={() => agregarItem(disfraz1)}
      >
        Agregar pirata
      </button>

      <button
        onClick={() => agregarItem(disfraz2)}
      >
        Agregar princesa
      </button>

      <button
        onClick={() => quitarItem("disfraz-1")}
      >
        Quitar pirata
      </button>

      <button onClick={vaciarCarrito}>
        Vaciar
      </button>

      <button onClick={abrirCarrito}>
        Abrir
      </button>

      <button onClick={cerrarCarrito}>
        Cerrar
      </button>

      <button onClick={descartarAviso}>
        Descartar aviso
      </button>
    </div>
  );
}

function renderCarrito() {
  return render(
    <CarritoProvider>
      <ConsumidorCarrito />
    </CarritoProvider>
  );
}

describe("Pruebas funcionales - CarritoContext", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("PF-FE-26: inicia con el carrito vacío, total cero y cerrado", () => {
    renderCarrito();

    expect(
      screen.getByTestId("cantidad")
    ).toHaveTextContent("0");

    expect(
      screen.getByTestId("total")
    ).toHaveTextContent("0");

    expect(
      screen.getByTestId("estado")
    ).toHaveTextContent("cerrado");
  });

  it("PF-FE-27: agrega un disfraz al carrito y lo abre automáticamente", () => {
    renderCarrito();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar pirata",
      })
    );

    expect(
      screen.getByTestId("cantidad")
    ).toHaveTextContent("1");

    expect(
      screen.getByTestId("nombres")
    ).toHaveTextContent("Pirata");

    expect(
      screen.getByTestId("estado")
    ).toHaveTextContent("abierto");
  });

  it("PF-FE-28: impide agregar dos veces el mismo disfraz físico", () => {
    renderCarrito();

    const boton = screen.getByRole("button", {
      name: "Agregar pirata",
    });

    fireEvent.click(boton);
    fireEvent.click(boton);

    expect(
      screen.getByTestId("cantidad")
    ).toHaveTextContent("1");

    expect(
      screen.getByTestId("total")
    ).toHaveTextContent("40");
  });

  it("PF-FE-29: calcula el total por día sumando los precios de los disfraces", () => {
    renderCarrito();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar pirata",
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar princesa",
      })
    );

    expect(
      screen.getByTestId("cantidad")
    ).toHaveTextContent("2");

    expect(
      screen.getByTestId("total")
    ).toHaveTextContent("100");
  });

  it("PF-FE-30: permite quitar un disfraz específico del carrito", () => {
    renderCarrito();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar pirata",
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar princesa",
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Quitar pirata",
      })
    );

    expect(
      screen.getByTestId("cantidad")
    ).toHaveTextContent("1");

    expect(
      screen.getByTestId("nombres")
    ).toHaveTextContent("Princesa");

    expect(
      screen.getByTestId("nombres")
    ).not.toHaveTextContent("Pirata");

    expect(
      screen.getByTestId("total")
    ).toHaveTextContent("60");
  });

  it("PF-FE-31: permite vaciar completamente el carrito", () => {
    renderCarrito();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar pirata",
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar princesa",
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Vaciar",
      })
    );

    expect(
      screen.getByTestId("cantidad")
    ).toHaveTextContent("0");

    expect(
      screen.getByTestId("total")
    ).toHaveTextContent("0");
  });

  it("PF-FE-32: permite abrir y cerrar manualmente el carrito", () => {
    renderCarrito();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Abrir",
      })
    );

    expect(
      screen.getByTestId("estado")
    ).toHaveTextContent("abierto");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cerrar",
      })
    );

    expect(
      screen.getByTestId("estado")
    ).toHaveTextContent("cerrado");
  });

  it("PF-FE-33: elimina automáticamente una reserva vencida y muestra un aviso", () => {
    vi.useFakeTimers();

    const ahora = new Date(
      "2026-10-25T15:00:00"
    ).getTime();

    vi.setSystemTime(ahora);

    function ConsumidorReserva() {
      const {
        items,
        agregarItem,
        aviso,
      } = useCarrito();

      return (
        <div>
          <span data-testid="cantidad-reserva">
            {items.length}
          </span>

          {aviso && (
            <div role="alert">
              {aviso}
            </div>
          )}

          <button
            onClick={() =>
              agregarItem({
                disfrazFisicoId: "medida-1",
                nombre: "Caballero a medida",
                tipoDisfraz: "A_MEDIDA",
                precioAlquiler: 80,
                reservaId: "reserva-1",
                venceMs: ahora + 1000,
              })
            }
          >
            Agregar reserva
          </button>
        </div>
      );
    }

    render(
      <CarritoProvider>
        <ConsumidorReserva />
      </CarritoProvider>
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar reserva",
      })
    );

    expect(
      screen.getByTestId("cantidad-reserva")
    ).toHaveTextContent("1");

    act(() => {
      vi.advanceTimersByTime(1301);
    });

    expect(
      screen.getByTestId("cantidad-reserva")
    ).toHaveTextContent("0");

    expect(
      screen.getByRole("alert")
    ).toHaveTextContent(
      "La reserva de «Caballero a medida» venció y se quitó del carrito."
    );

    vi.useRealTimers();
  });

  it("PF-FE-34: permite descartar el aviso generado por una reserva vencida", () => {
    vi.useFakeTimers();

    const ahora = new Date(
      "2026-10-25T15:00:00"
    ).getTime();

    vi.setSystemTime(ahora);

    function ConsumidorAviso() {
      const {
        agregarItem,
        aviso,
        descartarAviso,
      } = useCarrito();

      return (
        <div>
          {aviso && (
            <div role="alert">
              {aviso}
            </div>
          )}

          <button
            onClick={() =>
              agregarItem({
                disfrazFisicoId: "medida-2",
                nombre: "Héroe a medida",
                tipoDisfraz: "A_MEDIDA",
                precioAlquiler: 70,
                reservaId: "reserva-2",
                venceMs: ahora + 1000,
              })
            }
          >
            Agregar reserva
          </button>

          <button onClick={descartarAviso}>
            Descartar
          </button>
        </div>
      );
    }

    render(
      <CarritoProvider>
        <ConsumidorAviso />
      </CarritoProvider>
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar reserva",
      })
    );

    act(() => {
      vi.advanceTimersByTime(1301);
    });

    expect(
      screen.getByRole("alert")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Descartar",
      })
    );

    expect(
      screen.queryByRole("alert")
    ).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});