import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test as base, expect } from "@playwright/test";
import type { PrismaClient } from "../../../../backend/node_modules/@prisma/client";

const requireBackend = createRequire(new URL("../../../../backend/package.json", import.meta.url));
const { parse } = requireBackend("dotenv") as typeof import("../../../../backend/node_modules/dotenv");
const { PrismaClient: Cliente } = requireBackend("@prisma/client") as typeof import("../../../../backend/node_modules/@prisma/client");
const bcrypt = requireBackend("bcryptjs") as { hash: (texto: string, rondas: number) => Promise<string> };
const API = "http://localhost:3000/api";

interface DatosCatalogo {
  disfracesCreados: string[];
  promocionesCreadas: string[];
  recetasCreadas: string[];
  db: PrismaClient;
  usuarioId: string;
  prefijo: string;
  email: string;
  password: string;
  crear: (sufijo: string, opciones?: { tipo?: string; temporada?: string; imagenUrl?: string }) => Promise<{ id: string; nombre: string }>;
}

// Nunca hereda DATABASE_URL del entorno de desarrollo ni borra datos ajenos.
export const test = base.extend<{ catalogo: DatosCatalogo; catalogoRol: "CLIENTE" | "ADMINISTRADOR" }>({
  catalogoRol: ["CLIENTE", { option: true }],
  catalogo: async ({ request, catalogoRol }, proveer) => {
    const env = parse(readFileSync(new URL("../../../../backend/.env.test", import.meta.url)));
    if (env.NODE_ENV !== "test" || !env.DATABASE_URL || new URL(env.DATABASE_URL).pathname !== "/disfraz_test_db") {
      throw new Error("SEGURIDAD: estas pruebas requieren .env.test y disfraz_test_db.");
    }
    const db: PrismaClient = new Cliente({ datasources: { db: { url: env.DATABASE_URL } } });
    const ids: string[] = [];
    const recetasCreadas: string[] = [];
    const promocionesCreadas: string[] = [];
    let usuarioId: string | undefined;
    const prefijo = `rtmfront-${crypto.randomUUID().slice(0, 8)}`;
    const email = `${prefijo}@test.local`;
    const password = "PruebaRtm#2026";
    try {
      const bases = await db.$queryRaw<Array<{ nombre: string }>>`SELECT current_database() AS nombre`;
      expect(bases[0].nombre).toBe("disfraz_test_db");
      const crear: DatosCatalogo["crear"] = async (sufijo, opciones = {}) => {
        const disfraz = await db.disfrazFisico.create({ data: {
          nombre: `${prefijo} ${sufijo}`, tipoDisfraz: opciones.tipo ?? `${prefijo}-tipo`,
          temporadaEvento: opciones.temporada ?? `${prefijo}-temporada`, precioAlquiler: 40,
          imagenUrl: opciones.imagenUrl,
        } });
        ids.push(disfraz.id);
        await db.prenda.create({ data: {
          nombre: `Camisa ${prefijo}`, tipo: "CAMISA", color: "azul", talla: "M",
          disfrazHogarId: disfraz.id, disfrazActualId: disfraz.id,
        } });
        return { id: disfraz.id, nombre: disfraz.nombre };
      };
      const centinela = await crear("centinela");
      // Antes de iniciar sesión, confirma que la API está viendo nuestra BD de test.
      const respuesta = await request.get(`${API}/disfraces/${centinela.id}`);
      expect(respuesta.status(), "La API debe usar la misma BD de test").toBe(200);
      expect(await respuesta.json()).toMatchObject(centinela);
      const usuario = await db.usuario.create({ data: {
        nombre: prefijo, email, password: await bcrypt.hash(password, 10),
        telefono: "987654321", direccion: "Dirección E2E 123", rol: catalogoRol,
      } });
      usuarioId = usuario.id;
      await proveer({ prefijo, email, password, crear, db, usuarioId, recetasCreadas, promocionesCreadas, disfracesCreados: ids });
    } finally {
      try {
        await db.promocion.deleteMany({ where: { id: { in: promocionesCreadas } } });
        if (usuarioId) {
          await db.peticionDisfraz.deleteMany({ where: { usuarioId } });
          await db.devolucionPrenda.deleteMany({ where: { devolucion: { alquiler: { usuarioId } } } });
          await db.devolucion.deleteMany({ where: { alquiler: { usuarioId } } });
          await db.alquilerDisfraz.deleteMany({ where: { alquiler: { usuarioId } } });
          await db.alquiler.deleteMany({ where: { usuarioId } });
          const reservasPropias = await db.reserva.findMany({ where: { usuarioId }, include: { movimientos: { orderBy: { orden: "desc" } } } });
          for (const reserva of reservasPropias) {
            for (const movimiento of reserva.movimientos) {
              await db.prenda.updateMany({ where: { id: movimiento.prendaId, disfrazActualId: movimiento.haciaId }, data: { disfrazActualId: movimiento.desdeId } });
            }
          }
          await db.reserva.deleteMany({ where: { usuarioId } });
          await db.disfrazFisico.deleteMany({ where: {
            id: { in: reservasPropias.map(r => r.disfrazFisicoId) }, origen: "A_MEDIDA",
            prendasActuales: { none: {} }, alquileres: { none: {} },
          } });
          await db.sesionActiva.deleteMany({ where: { usuarioId } });
          await db.usuario.delete({ where: { id: usuarioId } });
        }
        await db.receta.deleteMany({ where: { id: { in: recetasCreadas } } });
        await db.prendaProveedor.deleteMany({ where: { proveedor: { nombre: { startsWith: prefijo } } } });
        await db.proveedor.deleteMany({ where: { nombre: { startsWith: prefijo } } });
        await db.sustitucion.deleteMany({ where: { prenda: { disfrazHogarId: { in: ids } } } });
        await db.prenda.deleteMany({ where: { disfrazHogarId: { in: ids } } });
        await db.disfrazFisico.deleteMany({ where: { id: { in: ids } } });
      } finally {
        await db.$disconnect();
      }
    }
  },
});
export { expect };
