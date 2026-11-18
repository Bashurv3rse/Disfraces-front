import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { resumenTallas } from "../../src/lib/prendas";
import { TemporalesAMedida } from "../../src/components/TemporalesAMedida";
import { api } from "../../src/lib/api";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("resumen de tallas", () => {
  it("separa ropa y calzado e ignora la talla única", () => {
    expect(resumenTallas(["L", "L", "38", "única"])).toEqual({ ropa: "L", calzado: "38" });
  });
  it("en un disfraz a medida muestra todas las tallas distintas", () => {
    expect(resumenTallas(["S", "M", "41"])).toEqual({ ropa: "S / M", calzado: "41" });
  });
});

describe("disfraces a medida temporales en el inventario", () => {
  it("no muestra nada si no hay ninguno", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ data: [] });
    const { container } = render(<TemporalesAMedida />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });

  it("lista cliente, estado, fechas y piezas", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: [
        {
          id: "m1", nombre: "A medida: Pirata", cliente: { nombre: "Ana", email: "ana@test.com" }, estado: "ALQUILADO",
          fechaInicio: "2026-11-16T00:00:00.000Z", fechaFin: "2026-11-18T00:00:00.000Z", lavadoHasta: null,
          prendas: [{ id: "p1", nombre: "Camisa blanca", color: "blanco", talla: "L", origen: "Almacén" }],
        },
      ],
    });
    render(<TemporalesAMedida />);
    expect(await screen.findByText("A medida: Pirata")).toBeInTheDocument();
    expect(screen.getByText("Alquilado")).toBeInTheDocument();
    expect(screen.getByText(/16\/11\/2026 al 18\/11\/2026/)).toBeInTheDocument();
  });
});
