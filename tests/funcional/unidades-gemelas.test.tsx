import { describe, expect, it } from "vitest";
import {
  agruparDisfraces,
  copiasPara,
  elegirCopia,
  ocupacionesComunes,
  type DisfrazCat,
} from "../../src/lib/agruparDisfraces";

function unidad(id: string, ropa: string, calzado: string, extra: Partial<DisfrazCat> = {}): DisfrazCat {
  return {
    id,
    nombre: `Batman #${id}`,
    familia: "Batman",
    tipoDisfraz: "HEROE",
    temporadaEvento: "Halloween",
    precioAlquiler: "50",
    imagenUrl: null,
    estado: "DISPONIBLE",
    bloqueo: null,
    prendasHogar: [
      { id: `${id}a`, nombre: "Camisa", tipo: "CAMISA", color: "negro", talla: ropa, estado: "DISPONIBLE" },
      { id: `${id}b`, nombre: "Botas", tipo: "ZAPATO", color: "negro", talla: calzado, estado: "DISPONIBLE" },
    ],
    ...extra,
  };
}

describe("copias idénticas de un disfraz (PF-FE-GEM)", () => {
  const grupo = agruparDisfraces([unidad("1", "M", "40"), unidad("2", "M", "40"), unidad("3", "L", "40")])[0];

  it("copiasPara devuelve todas las unidades con esas tallas", () => {
    expect(copiasPara(grupo, "M", "40").map((c) => c.id)).toEqual(["1", "2"]);
    expect(copiasPara(grupo, "L", "40").map((c) => c.id)).toEqual(["3"]);
    expect(copiasPara(grupo, "XL", "40")).toEqual([]);
  });

  it("elegirCopia prefiere una que no esté ya en el carrito", () => {
    const copias = copiasPara(grupo, "M", "40");
    expect(elegirCopia(copias, ["1"])?.id).toBe("2");
    expect(elegirCopia(copias, [])?.id).toBe("1");
  });

  it("elegirCopia prefiere una libre hoy", () => {
    const ocupada = unidad("1", "M", "40", { estado: "ALQUILADO" });
    const libre = unidad("2", "M", "40");
    expect(elegirCopia([ocupada, libre])?.id).toBe("2");
  });

  it("ocupacionesComunes solo marca los días ocupados en todas las copias", () => {
    const a = unidad("1", "M", "40", { ocupaciones: [{ desde: "2027-03-10", hasta: "2027-03-20" }] });
    const b = unidad("2", "M", "40", { ocupaciones: [{ desde: "2027-03-15", hasta: "2027-03-25" }] });
    expect(ocupacionesComunes([a, b])).toEqual([{ desde: "2027-03-15", hasta: "2027-03-20" }]);
    expect(ocupacionesComunes([a])).toEqual(a.ocupaciones);
    const libre = unidad("3", "M", "40", { ocupaciones: [] });
    expect(ocupacionesComunes([a, libre])).toEqual([]);
    expect(ocupacionesComunes([])).toEqual([]);
  });
});
