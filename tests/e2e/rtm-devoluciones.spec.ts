import { test, expect } from "./fixtures/catalogo";
import { CatalogoPage } from "./pages/CatalogoPage";
import { MisAlquileresPage } from "./pages/MisAlquileresPage";

interface CasoDevolucion {
  disfraz: { id: string; nombre: string };
  alquiler: { id: string };
  prendas: Array<{ id: string; nombre: string }>;
  conProblemas: boolean;
}

test("TC-E2E-DEV-02: devolver en buen estado o con prendas dañadas/faltantes deja la garantía en revisión", async ({ page, catalogo }) => {
  const casos: CasoDevolucion[] = [];
  for (const conProblemas of [false, true]) {
    const disfraz = await catalogo.crear(conProblemas ? "devolución con problemas" : "devolución buen estado");
    const camisa = await catalogo.db.prenda.findFirstOrThrow({ where: { disfrazHogarId: disfraz.id } });
    const accesorio = await catalogo.db.prenda.create({ data: {
      nombre: `Accesorio ${disfraz.nombre}`, tipo: "ACCESORIO", talla: "M", color: "azul",
      disfrazHogarId: disfraz.id, disfrazActualId: disfraz.id,
    } });
    const alquiler = await catalogo.db.alquiler.create({ data: {
      usuarioId: catalogo.usuarioId, evento: disfraz.nombre, estado: "ACTIVO", montoTotal: 80, montoGarantia: 20,
      fechaInicio: new Date(Date.now() - 86_400_000), fechaFin: new Date(Date.now() + 86_400_000),
      disfraces: { create: { disfrazFisicoId: disfraz.id, precioUnitario: 40 } },
    } });
    casos.push({ disfraz, alquiler, prendas: [camisa, accesorio], conProblemas });
  }
  await new CatalogoPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const ui = new MisAlquileresPage(page);
  await ui.abrir();
  for (const caso of casos) {
    await test.step(caso.disfraz.nombre, async () => {
      await ui.tarjeta(caso.disfraz.nombre).getByRole("button", { name: "Devolver", exact: true }).click();
      const modal = page.getByRole("dialog", { name: "Reportar estado de devolución", exact: true });
      await expect(modal.getByRole("button", { name: "Reporta el estado de todas las prendas", exact: true })).toBeDisabled();
      // Cancelar no registra una devolución ni finaliza el alquiler.
      await modal.getByRole("button", { name: "Cerrar", exact: true }).click();
      await expect(modal).toHaveCount(0);
      expect(await catalogo.db.devolucion.count({ where: { alquilerId: caso.alquiler.id } })).toBe(0);
      expect((await catalogo.db.alquiler.findUniqueOrThrow({ where: { id: caso.alquiler.id } })).estado).toBe("ACTIVO");
      await ui.tarjeta(caso.disfraz.nombre).getByRole("button", { name: "Devolver", exact: true }).click();
      const estados = caso.conProblemas ? ["DANADA", "FALTANTE"] as const : ["BUEN_ESTADO", "BUEN_ESTADO"] as const;
      const etiquetas = caso.conProblemas ? ["Dañada", "Faltante"] : ["Buen estado", "Buen estado"];
      for (let i = 0; i < caso.prendas.length; i++) {
        await modal.locator(".reportar-prenda").filter({ hasText: caso.prendas[i].nombre }).getByRole("button", { name: etiquetas[i], exact: true }).click();
        if (i === 0) await expect(modal.getByRole("button", { name: "Reporta el estado de todas las prendas", exact: true })).toBeDisabled();
      }
      const reporte = page.waitForResponse(res => res.url().endsWith("/api/devoluciones") && res.request().method() === "POST");
      await modal.getByRole("button", { name: "Confirmar devolución", exact: true }).click();
      const respuesta = await reporte;
      expect(respuesta.status()).toBe(201);
      expect(respuesta.request().postDataJSON()).toMatchObject({
        alquilerId: caso.alquiler.id,
        prendas: caso.prendas.map((p, i) => ({ prendaId: p.id, estadoPrenda: estados[i] })),
      });
      expect((await respuesta.json()).sustituciones).toEqual([]);
      await expect(modal).toHaveCount(0);
      await expect(ui.tarjeta(caso.disfraz.nombre)).toHaveCount(0);
      await page.getByRole("tab", { name: /^Historial/ }).click();
      const tarjeta = ui.tarjeta(caso.disfraz.nombre);
      await expect(tarjeta).toBeVisible();
      await expect(tarjeta.getByText("Tu garantía está en revisión", { exact: true })).toBeVisible();
      await expect(tarjeta.getByRole("button", { name: "Devolver", exact: true })).toHaveCount(0);
      await tarjeta.getByText("Ver la revisión de las prendas", { exact: true }).click();
      const revisiones = tarjeta.locator(".garantia__prendas li");
      await expect(revisiones).toHaveCount(2);
      for (let i = 0; i < caso.prendas.length; i++) await expect(revisiones.filter({ hasText: caso.prendas[i].nombre }).locator("strong")).toHaveText(etiquetas[i]);
      const guardada = await catalogo.db.devolucion.findUniqueOrThrow({ where: { alquilerId: caso.alquiler.id }, include: { prendas: true } });
      expect(guardada).toMatchObject({ garantiaEstado: "PENDIENTE", garantiaResueltaEn: null, garantiaResueltaPorId: null, garantiaReembolsoId: null });
      expect(guardada.prendas).toEqual(expect.arrayContaining(caso.prendas.map((p, i) => expect.objectContaining({ prendaId: p.id, estadoPrenda: estados[i] }))));
      expect((await catalogo.db.alquiler.findUniqueOrThrow({ where: { id: caso.alquiler.id } })).estado).toBe("FINALIZADO");
      expect(await catalogo.db.disfrazFisico.findUniqueOrThrow({ where: { id: caso.disfraz.id } })).toMatchObject({ estadoManual: "SUSPENDIDO", fechaSuspension: expect.any(Date) });
      for (let i = 0; i < caso.prendas.length; i++) {
        expect((await catalogo.db.prenda.findUniqueOrThrow({ where: { id: caso.prendas[i].id } })).estado).toBe(estados[i] === "BUEN_ESTADO" ? "DISPONIBLE" : estados[i]);
      }
      await page.reload();
      await page.getByRole("tab", { name: /^Historial/ }).click();
      await expect(ui.tarjeta(caso.disfraz.nombre).getByText("Tu garantía está en revisión", { exact: true })).toBeVisible();
      expect(await catalogo.db.devolucion.count({ where: { alquilerId: caso.alquiler.id } })).toBe(1);
      await page.getByRole("tab", { name: /^Activos/ }).click();
    });
  }
  await expect(page.getByText("No tienes alquileres activos todavía.", { exact: true })).toBeVisible();
});
