import { categoriaTalla } from "./prendas";

export interface PrendaCat {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  talla: string;
  estado: string;
}

export type EstadoDisfraz = "DISPONIBLE" | "INCOMPLETO" | "ALQUILADO" | "RESERVADO" | "EN_REPARACION" | "SUSPENDIDO";

export interface DisfrazCat {
  id: string;
  nombre: string;
  familia?: string | null;
  tipoDisfraz: string;
  temporadaEvento: string;
  precioAlquiler: string;
  imagenUrl: string | null;
  estado: EstadoDisfraz;
  // Solo cuando el servidor calcula la disponibilidad para unas fechas.
  disponibilidad?: { estado: EstadoDisfraz; disponible: boolean };
  ocupaciones?: { desde: string; hasta: string }[];
  // Marca física que impide alquilar en cualquier fecha (a diferencia de un alquiler, que solo ocupa unos días).
  bloqueo?: "EN_REPARACION" | "RESERVADO" | "INCOMPLETO" | null;
  prendasHogar: PrendaCat[];
}

export interface GrupoDisfraz {
  clave: string;
  nombre: string;
  representante: DisfrazCat;
  variantes: DisfrazCat[];
}

// Estado que se muestra al cliente: el de las fechas elegidas si el servidor lo informó.
export function estadoVisible(d: DisfrazCat): EstadoDisfraz {
  return d.disponibilidad?.estado ?? d.estado;
}

const BLOQUEOS = ["EN_REPARACION", "RESERVADO", "INCOMPLETO"] as const;

// Si el servidor no informa el bloqueo se deduce del estado de hoy.
export function bloqueoDe(d: DisfrazCat): (typeof BLOQUEOS)[number] | null {
  if (d.bloqueo !== undefined) return d.bloqueo;
  return (BLOQUEOS as readonly string[]).includes(d.estado) ? (d.estado as (typeof BLOQUEOS)[number]) : null;
}

export function estaDisponible(d: DisfrazCat): boolean {
  return estadoVisible(d) === "DISPONIBLE";
}

// Los disfraces iguales que solo cambian de talla se juntan en una sola tarjeta.
export function agruparDisfraces(disfraces: DisfrazCat[]): GrupoDisfraz[] {
  const grupos = new Map<string, DisfrazCat[]>();
  for (const d of disfraces) {
    const clave = (d.familia?.trim() || d.nombre).toLowerCase();
    grupos.set(clave, [...(grupos.get(clave) ?? []), d]);
  }
  return Array.from(grupos.entries()).map(([clave, variantes]) => {
    const representante = variantes.find(estaDisponible) ?? variantes[0];
    return { clave, nombre: representante.familia?.trim() || representante.nombre, representante, variantes };
  });
}

// Tallas de ropa que se ofrecen en el catálogo.
export const TALLAS_ROPA_CATALOGO = ["S", "M", "L", "XL"];

export function tallaDe(d: DisfrazCat, categoria: "ROPA" | "CALZADO"): string | null {
  const tallas = d.prendasHogar.filter((p) => categoriaTalla(p.tipo) === categoria).map((p) => p.talla);
  if (tallas.length === 0) return null;
  // Si el disfraz mezcla varias tallas de ropa, se toma la más frecuente.
  const cuenta = new Map<string, number>();
  for (const t of tallas) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// Opciones de talla que existen en el grupo. Las dos listas dependen una de otra: al elegir la talla
// de ropa solo aparecen los calzados que de verdad existen con ella (y al revés), así nunca se llega
// a una combinación inexistente.
export function opcionesDeTalla(grupo: GrupoDisfraz, ropa: string | null, calzado: string | null) {
  const ropas = new Set<string>();
  const calzados = new Set<string>();
  for (const v of grupo.variantes) {
    const r = tallaDe(v, "ROPA");
    const c = tallaDe(v, "CALZADO");
    if (r && TALLAS_ROPA_CATALOGO.includes(r) && (calzado === null || c === calzado)) ropas.add(r);
    if (c && (ropa === null || r === ropa)) calzados.add(c);
  }
  return { ropas: ordenarTallas([...ropas], "ROPA"), calzados: ordenarTallas([...calzados], "CALZADO") };
}

export function ordenarTallas(tallas: string[], categoria: "ROPA" | "CALZADO"): string[] {
  const orden = ["XS", "S", "M", "L", "XL", "XXL"];
  const unicas = Array.from(new Set(tallas));
  return categoria === "CALZADO"
    ? unicas.sort((a, b) => Number(a) - Number(b))
    : unicas.sort((a, b) => (orden.indexOf(a) + 100 * +(orden.indexOf(a) < 0)) - (orden.indexOf(b) + 100 * +(orden.indexOf(b) < 0)));
}

// Unidades del grupo con las tallas elegidas. Puede haber varias copias idénticas: si una está
// alquilada en unas fechas, otra puede estar libre.
export function copiasPara(grupo: GrupoDisfraz, ropa: string | null, calzado: string | null): DisfrazCat[] {
  return grupo.variantes.filter(
    (v) => (ropa === null || tallaDe(v, "ROPA") === ropa) && (calzado === null || tallaDe(v, "CALZADO") === calzado)
  );
}

// Copia que conviene ofrecer: una que no esté ya en el carrito, mejor si está libre hoy.
export function elegirCopia(copias: DisfrazCat[], idsEnCarrito: string[] = []): DisfrazCat | null {
  const sinCarrito = copias.filter((c) => !idsEnCarrito.includes(c.id));
  const lista = sinCarrito.length > 0 ? sinCarrito : copias;
  return lista.find(estaDisponible) ?? lista[0] ?? null;
}

// Variante del grupo que coincide con las tallas elegidas (null si no existe esa combinación).
export function variantePara(grupo: GrupoDisfraz, ropa: string | null, calzado: string | null): DisfrazCat | null {
  return elegirCopia(copiasPara(grupo, ropa, calzado));
}

type Tramo = { desde: string; hasta: string };

// Días ocupados en TODAS las copias: solo en esos días no queda ninguna unidad para alquilar.
export function ocupacionesComunes(copias: DisfrazCat[]): Tramo[] {
  if (copias.length === 0) return [];
  return copias
    .map((c) => c.ocupaciones ?? [])
    .reduce<Tramo[]>((comunes, siguiente) => {
      const resultado: Tramo[] = [];
      for (const a of comunes) {
        for (const b of siguiente) {
          const desde = a.desde > b.desde ? a.desde : b.desde;
          const hasta = a.hasta < b.hasta ? a.hasta : b.hasta;
          if (desde <= hasta) resultado.push({ desde, hasta });
        }
      }
      return resultado;
    }, copias[0].ocupaciones ?? []);
}

export function formatearDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
