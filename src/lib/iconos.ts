export const ICONO_POR_TIPO: Record<string, string> = {
  SOMBRERO: "🎩",
  CAMISA: "👕",
  PANTALON: "👖",
  FALDA: "👗",
  ZAPATO: "👟",
  ABRIGO: "🧥",
  CHALECO: "🦺",
  ACCESORIO: "💍",
  PANUELO: "🧣",
  TACON: "👠",
};

export const ICONO_POR_TEMPORADA: Record<string, string> = {
  halloween: "🎃",
  navidad: "🎄",
  gala: "✨",
  verano: "🏖️",
  carnaval: "🎭",
  criollo: "💃",
  boda: "💍",
  deportivo: "⚽",
};

const COLORES_FONDO = ["#F1DFC4", "#E7D9E8", "#D9E8E2", "#F0DCD3", "#DDE3EF"];

export function colorPorSemilla(semilla: string): string {
  let hash = 0;
  for (let i = 0; i < semilla.length; i++) hash = semilla.charCodeAt(i) + ((hash << 5) - hash);
  return COLORES_FONDO[Math.abs(hash) % COLORES_FONDO.length];
}

export function iconoPorTipo(tipo: string): string {
  return ICONO_POR_TIPO[tipo] || "🧵";
}

export function iconoPorTemporada(temporada: string): string {
  const clave = temporada.toLowerCase().trim();
  return ICONO_POR_TEMPORADA[clave] || "🎭";
}