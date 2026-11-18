import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistorialDisfraz } from "../../src/components/HistorialDisfraz";
import { api } from "../../src/lib/api";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const eventos = [
  { fecha: "2026-11-01T10:00:00.000Z", categoria: "REGISTRO", titulo: "Disfraz registrado", detalle: "Se registró «Batman»." },
  { fecha: "2026-11-05T10:00:00.000Z", categoria: "ALQUILER", titulo: "Alquilado por Ana", detalle: "Del 10/11 al 12/11." },
];

describe("Historial de un disfraz", () => {
  it("no consulta nada hasta que se abre y luego muestra la línea de tiempo", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { eventos } });
    const user = userEvent.setup();
    render(<HistorialDisfraz disfrazId="d1" />);
    expect(get).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Historial" }));
    expect(await screen.findByText("Disfraz registrado")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/disfraces/d1/historial");
    expect(screen.getByText("Alquilado por Ana")).toBeInTheDocument();
  });

  it("filtra por categoría", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ data: { eventos } });
    const user = userEvent.setup();
    render(<HistorialDisfraz disfrazId="d1" />);
    await user.click(screen.getByRole("button", { name: "Historial" }));
    await screen.findByText("Disfraz registrado");
    await user.selectOptions(screen.getByLabelText("Mostrar"), "ALQUILER");
    expect(screen.queryByText("Disfraz registrado")).not.toBeInTheDocument();
    expect(screen.getByText("Alquilado por Ana")).toBeInTheDocument();
  });

  it("avisa si no se pudo cargar", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("x"));
    const user = userEvent.setup();
    render(<HistorialDisfraz disfrazId="d1" />);
    await user.click(screen.getByRole("button", { name: "Historial" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el historial");
  });
});
