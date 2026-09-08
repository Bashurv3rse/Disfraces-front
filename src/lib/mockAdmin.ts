// Datos ficticios para las pantallas de administración (Sprint 4-5).
// Se reemplazan por datos reales del backend en el Sprint 7.

export const METRICAS = {
  totalAlquileres: 6,
  variacionMensual: 12,
  alquileresActivos: 3,
  ingresosMes: 857,
  devolucionesPendientes: 2,
};

export const INGRESOS_MENSUALES = [
  { mes: "May", ingresos: 700 },
  { mes: "Jun", ingresos: 1180 },
  { mes: "Jul", ingresos: 1010 },
  { mes: "Ago", ingresos: 857 },
];

export const POR_CATEGORIA = [
  { categoria: "Abrigos", valor: 1 },
  { categoria: "Accesorios", valor: 2 },
  { categoria: "Camisas/Polos", valor: 1 },
  { categoria: "Pantalones", valor: 1 },
  { categoria: "Sombreros", valor: 2 },
  { categoria: "Tacones", valor: 1 },
  { categoria: "Trajes", valor: 1 },
  { categoria: "Zapatos", valor: 1 },
];

export const ALQUILERES_POR_DIA = [
  { dia: "Lun", cantidad: 3 },
  { dia: "Mar", cantidad: 5 },
  { dia: "Mié", cantidad: 1 },
  { dia: "Jue", cantidad: 7 },
  { dia: "Vie", cantidad: 8 },
  { dia: "Sáb", cantidad: 12 },
  { dia: "Dom", cantidad: 7 },
];

export const ULTIMOS_ALQUILERES = [
  { cliente: "María García", monto: 142, estado: "completado" },
  { cliente: "María García", monto: 158, estado: "activo" },
  { cliente: "Carlos Rodríguez", monto: 194, estado: "completado" },
  { cliente: "Sofía Martínez", monto: 112, estado: "activo" },
  { cliente: "Alejandro Pérez", monto: 147, estado: "completado" },
];

export const ALERTAS_STOCK = [
  { nombre: "Botas de Mosquetero", detalle: "Marrón Cuero · D'Artagnan", unidades: 5 },
  { nombre: "Abrigo de Conde Vampiro", detalle: "Negro/Rojo · Nosferatu Elite", unidades: 4 },
  { nombre: "Abrigo Mago Estelar", detalle: "Azul Noche/Dorado · Arcano Mayor", unidades: 3 },
  { nombre: "Traje de Arlequín Completo", detalle: "Rojo/Negro/Blanco · Harlekin Pro", unidades: 5 },
];

export interface Devolucion {
  id: string;
  codigo: string;
  cliente: string;
  fechaDevolucion: string;
  alquilerRef: string;
  estadoPrendas: "Bueno" | "Regular" | "Dañado";
  estado: "pendiente" | "aprobada" | "rechazada";
  prendas: string[];
  comentario: string;
}

export const DEVOLUCIONES: Devolucion[] = [
  {
    id: "dev1",
    codigo: "#dev1",
    cliente: "María García",
    fechaDevolucion: "13 ago. 2026",
    alquilerRef: "#r1",
    estadoPrendas: "Bueno",
    estado: "pendiente",
    prendas: ["Traje de Arlequín Completo · T: M", "Pantalón de Arlequín · T: M"],
    comentario: "El traje tiene una pequeña mancha en la manga izquierda.",
  },
  {
    id: "dev2",
    codigo: "#dev2",
    cliente: "Alejandro Pérez",
    fechaDevolucion: "10 ago. 2026",
    alquilerRef: "#r4",
    estadoPrendas: "Bueno",
    estado: "aprobada",
    prendas: ["Sombrero de Pirata · T: M"],
    comentario: "Sin observaciones, todo en buen estado.",
  },
  {
    id: "dev3",
    codigo: "#dev3",
    cliente: "Carlos Rodríguez",
    fechaDevolucion: "18 ago. 2026",
    alquilerRef: "#r3",
    estadoPrendas: "Regular",
    estado: "pendiente",
    prendas: ["Traje de Caballero Medieval · T: L", "Botas de Mosquetero · T: 42"],
    comentario: "Las botas tienen el tacón un poco desgastado.",
  },
];

export const COMBINACIONES_TOP = [
  { nombre: "Pantalones + Trajes", veces: 1, ingresos: 142 },
  { nombre: "Abrigos + Accesorios + Sombreros + Tacones", veces: 1, ingresos: 158 },
  { nombre: "Trajes + Zapatos", veces: 1, ingresos: 194 },
  { nombre: "Accesorios + Tacones + Zapatos", veces: 1, ingresos: 112 },
  { nombre: "Camisas/Polos + Pantalones + Sombreros", veces: 1, ingresos: 147 },
  { nombre: "Abrigos + Accesorios", veces: 1, ingresos: 104 },
];

export const PRENDAS_MAS_SOLICITADAS = [
  { nombre: "Varita Mágica", veces: 2 },
  { nombre: "Traje de Esmoquin", veces: 1 },
  { nombre: "Pantalón de Vestir", veces: 1 },
  { nombre: "Abrigo de Invierno", veces: 1 },
  { nombre: "Tacones Dorados", veces: 1 },
  { nombre: "Sombrero de Copa", veces: 1 },
  { nombre: "Traje de Reno", veces: 1 },
  { nombre: "Botas de Combate", veces: 1 },
];

export const POR_TEMPORADA_REPORTE = [
  { temporada: "Todas", cantidad: 10 },
  { temporada: "Otoño", cantidad: 3 },
  { temporada: "Primavera", cantidad: 2 },
  { temporada: "Invierno", cantidad: 2 },
];

export const RENDIMIENTO_PROVEEDOR = [
  { nombre: "Vestuario Teatral Lima", modelos: 5, pais: "Perú" },
  { nombre: "Disfraces Mágicos Madrid", modelos: 6, pais: "España" },
  { nombre: "Costume World Buenos Aires", modelos: 4, pais: "Argentina" },
  { nombre: "Karnaval Bogotá", modelos: 3, pais: "Colombia" },
];