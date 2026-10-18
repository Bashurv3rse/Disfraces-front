export const TIPOS_PRENDA = [
  { valor: "SOMBRERO", etiqueta: "Sombrero" },
  { valor: "CAMISA", etiqueta: "Camisa / polo" },
  { valor: "PANTALON", etiqueta: "Pantalón" },
  { valor: "FALDA", etiqueta: "Falda" },
  { valor: "ZAPATO", etiqueta: "Zapato" },
  { valor: "ABRIGO", etiqueta: "Abrigo / capa" },
  { valor: "CHALECO", etiqueta: "Chaleco" },
  { valor: "ACCESORIO", etiqueta: "Accesorio" },
  { valor: "PANUELO", etiqueta: "Pañuelo" },
  { valor: "TACON", etiqueta: "Tacón" },
];

export function etiquetaTipo(tipo: string): string {
  return TIPOS_PRENDA.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
}

export type CategoriaTalla = "ROPA" | "CALZADO" | "UNICA";

export const TALLAS_ROPA = ["XS", "S", "M", "L", "XL", "XXL"];
export const TALLAS_CALZADO = Array.from({ length: 13 }, (_, i) => String(34 + i)); // 34 … 46

export function categoriaTalla(tipo: string): CategoriaTalla {
  if (tipo === "ZAPATO" || tipo === "TACON") return "CALZADO";
  if (tipo === "PANUELO" || tipo === "ACCESORIO") return "UNICA";
  return "ROPA";
}

export function tallasPermitidas(tipo: string): string[] {
  switch (categoriaTalla(tipo)) {
    case "CALZADO":
      return TALLAS_CALZADO;
    case "UNICA":
      return ["única"];
    default:
      return TALLAS_ROPA;
  }
}