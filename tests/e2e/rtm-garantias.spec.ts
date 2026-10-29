import { test, expect } from "./fixtures/catalogo";
import { AdminPage } from "./pages/AdminPage";
import { GarantiasPage } from "./pages/GarantiasPage";

test.use({ catalogoRol: "ADMINISTRADOR" });

test("TC-E2E-GAR-01: revisar, corregir prendas y decidir devolver o retener la garantía desde el panel", async ({ page, catalogo }) => {
  const casos: Array<{ nombre: string; devolucionId: string; prendaId: string; accion: "DEVOLVER" | "RETENER" }> = [];
  for (const accion of ["DEVOLVER", "RETENER"] as const) {
    const disfraz = await catalogo.crear(`garantía ${accion}`);
    const prenda = await catalogo.db.prenda.findFirstOrThrow({ where: { disfrazHogarId: disfraz.id } });
    await catalogo.db.prenda.update({ where: { id: prenda.id }, data: { estado: "DANADA" } });
    const accesorio = await catalogo.db.prenda.create({ data: {
      nombre: `Accesorio ${disfraz.nombre}`, tipo: "ACCESORIO", talla: "M", color: "azul", estado: "DANADA",
      disfrazHogarId: disfraz.id, disfrazActualId: disfraz.id,
    } });
    const alquiler = await catalogo.db.alquiler.create({ data: {
      usuarioId: catalogo.usuarioId, estado: "FINALIZADO", fechaInicio: new Date(Date.now() - 3 * 86_400_000), fechaFin: new Date(Date.now() - 86_400_000),
      montoTotal: 80, montoGarantia: 20, evento: disfraz.nombre,
      disfraces: { create: { disfrazFisicoId: disfraz.id, precioUnitario: 40 } },
    } });
    const devolucion = await catalogo.db.devolucion.create({ data: {
      alquilerId: alquiler.id, fechaDevolucion: new Date(), estado: "APROBADA",
      prendas: { create: [{ prendaId: prenda.id, estadoPrenda: "DANADA" }, { prendaId: accesorio.id, estadoPrenda: "DANADA" }] },
    } });
    casos.push({ nombre: disfraz.nombre, devolucionId: devolucion.id, prendaId: prenda.id, accion });
  }
  await new AdminPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const ui = new GarantiasPage(page);
  await ui.abrir();
  for (const caso of casos) {
    await test.step(caso.accion, async () => {
      const tarjeta = ui.tarjeta(caso.nombre);
      await expect(tarjeta).toBeVisible();
      await expect(tarjeta.locator(".dev-pill")).toHaveText("Por resolver");
      const correccion = page.waitForResponse(res => res.url().endsWith(`/api/devoluciones/${caso.devolucionId}/prendas/${caso.prendaId}`) && res.request().method() === "PATCH");
      await tarjeta.getByRole("combobox", { name: `Estado de Camisa ${catalogo.prefijo} según tu revisión`, exact: true }).selectOption("BUEN_ESTADO");
      expect((await correccion).status()).toBe(200);
      await expect(tarjeta.getByText("Corregida", { exact: true })).toBeVisible();
      expect(await catalogo.db.devolucionPrenda.findFirstOrThrow({ where: { devolucionId: caso.devolucionId, prendaId: caso.prendaId } })).toMatchObject({ estadoPrenda: "DANADA", estadoAdmin: "BUEN_ESTADO" });
      expect((await catalogo.db.prenda.findUniqueOrThrow({ where: { id: caso.prendaId } })).estado).toBe("DISPONIBLE");
      if (caso.accion === "DEVOLVER") {
        await tarjeta.getByRole("button", { name: "Devolver garantía · S/ 20.00", exact: true }).click();
        await expect(tarjeta.getByText("Hay prendas con problemas. ¿Devolver la garantía igualmente?", { exact: true })).toBeVisible();
      } else {
        await tarjeta.getByRole("button", { name: "Retener garantía", exact: true }).click();
        const motivo = tarjeta.getByLabel("Motivo de la retención (obligatorio)", { exact: true });
        await motivo.fill("");
        await expect(tarjeta.getByRole("button", { name: "Confirmar retención", exact: true })).toBeDisabled();
        await motivo.fill("Accesorio dañado tras la inspección");
      }
      await tarjeta.getByRole("button", { name: "Cancelar", exact: true }).click();
      expect((await catalogo.db.devolucion.findUniqueOrThrow({ where: { id: caso.devolucionId } })).garantiaEstado).toBe("PENDIENTE");
      await tarjeta.getByRole("button", { name: caso.accion === "DEVOLVER" ? "Devolver garantía · S/ 20.00" : "Retener garantía", exact: true }).click();
      if (caso.accion === "RETENER") await tarjeta.getByLabel("Motivo de la retención (obligatorio)", { exact: true }).fill("Accesorio dañado tras la inspección");
      const resolucion = page.waitForResponse(res => res.url().endsWith(`/api/devoluciones/${caso.devolucionId}/garantia`) && res.request().method() === "POST");
      await tarjeta.getByRole("button", { name: caso.accion === "DEVOLVER" ? "Sí, devolver S/ 20.00" : "Confirmar retención", exact: true }).click();
      expect((await resolucion).status()).toBe(200);
      await expect(tarjeta).toHaveCount(0);
      await page.getByRole("tab", { name: /^Resueltas/ }).click();
      await expect(tarjeta.locator(".dev-comprobante")).toContainText(caso.accion === "DEVOLVER" ? "Garantía devuelta · S/ 20.00" : "Garantía retenida · S/ 20.00");
      await expect(tarjeta.getByRole("combobox")).toHaveCount(0);
      const guardada = await catalogo.db.devolucion.findUniqueOrThrow({ where: { id: caso.devolucionId } });
      expect(guardada).toMatchObject({ garantiaEstado: caso.accion === "DEVOLVER" ? "DEVUELTA" : "RETENIDA", garantiaResueltaPorId: catalogo.usuarioId, garantiaResueltaEn: expect.any(Date), garantiaReembolsoId: null });
      expect(Number(guardada.garantiaMonto)).toBe(20);
      if (caso.accion === "RETENER") expect(guardada.garantiaMotivo).toBe("Accesorio dañado tras la inspección");
      await page.reload();
      await page.getByRole("tab", { name: /^Resueltas/ }).click();
      await expect(tarjeta.locator(".dev-comprobante")).toBeVisible();
      await expect(tarjeta.getByRole("combobox")).toHaveCount(0);
      await page.getByRole("tab", { name: /^Por resolver/ }).click();
    });
  }
});
