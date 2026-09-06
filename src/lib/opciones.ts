const TALLAS_ROPA = ["S", "M", "L", "XL"];
const TALLAS_CALZADO = ["34", "36", "38", "40", "42"];
const COLORES_GENERICOS = ["negro", "blanco", "gris", "rojo", "azul", "dorado", "plateado", "multicolor"];

export function tallasPorDefecto(tipo: string): string[] {
  return tipo === "ZAPATO_ZAPATILLA" || tipo === "TACON" ? TALLAS_CALZADO : TALLAS_ROPA;
}

export function coloresPorDefecto(): string[] {
  return COLORES_GENERICOS;
}