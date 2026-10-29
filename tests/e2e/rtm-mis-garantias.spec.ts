import { test, expect } from "./fixtures/catalogo";
import { CatalogoPage } from "./pages/CatalogoPage";
import { MisAlquileresPage } from "./pages/MisAlquileresPage";

test("TC-E2E-GAR-02: Mis alquileres muestra estado, importe, motivo y revisión de la garantía", async ({ page, catalogo }) => {
  const casos: Array<{ nombre: string; estado: "PENDIENTE" | "DEVUELTA" | "RETENIDA" }> = [];
  for (const estado of ["PENDIENTE", "DEVUELTA", "RETENIDA"] as const) {
    const disfraz = await catalogo.crear(`comprobante ${estado}`);
    const prenda = await catalogo.db.prenda.findFirstOrThrow({ where: { disfrazHogarId: disfraz.id } });
    const alquiler = await catalogo.db.alquiler.create({ data: {
      usuarioId: catalogo.usuarioId, evento: disfraz.nombre, estado: "FINALIZADO", montoTotal: 80, montoGarantia: 20,
      fechaInicio: new Date(Date.now() - 3 * 86_400_000), fechaFin: new Date(Date.now() - 86_400_000),
      disfraces: { create: { disfrazFisicoId: disfraz.id, precioUnitario: 40 } },
    } });
    await catalogo.db.devolucion.create({ data: {
      alquilerId: alquiler.id, fechaDevolucion: new Date(), estado: "APROBADA", garantiaEstado: estado,
      garantiaMonto: estado === "PENDIENTE" ? null : 20,
      garantiaMotivo: estado === "RETENIDA" ? "Prenda dañada según inspección RTM" : null,
      garantiaResueltaEn: estado === "PENDIENTE" ? null : new Date(),
      prendas: { create: { prendaId: prenda.id, estadoPrenda: "DANADA", estadoAdmin: estado === "DEVUELTA" ? "BUEN_ESTADO" : null, observacion: "Revisión de prueba" } },
    } });
    casos.push({ nombre: disfraz.nombre, estado });
  }
  await new CatalogoPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const ui = new MisAlquileresPage(page);
  await ui.abrir();
  await page.getByRole("tab", { name: "Historial (3)", exact: true }).click();
  for (const caso of casos) {
    const tarjeta = ui.tarjeta(caso.nombre);
    await expect(tarjeta).toBeVisible();
    const comprobante = tarjeta.locator(".garantia");
    await expect(comprobante).toContainText("S/ 20.00");
    if (caso.estado === "PENDIENTE") await expect(comprobante.getByText("Tu garantía está en revisión", { exact: true })).toBeVisible();
    if (caso.estado === "DEVUELTA") {
      await expect(comprobante).toContainText("Garantía devuelta: S/ 20.00");
      await expect(comprobante.getByText("Se te entregó en la tienda.", { exact: true })).toBeVisible();
    }
    if (caso.estado === "RETENIDA") {
      await expect(comprobante).toContainText("Garantía retenida: S/ 20.00");
      await expect(comprobante).toContainText("Motivo: Prenda dañada según inspección RTM");
    }
    await comprobante.getByText("Ver la revisión de las prendas", { exact: true }).click();
    await expect(comprobante.locator("li")).toHaveCount(1);
    await expect(comprobante.locator("li strong")).toHaveText(caso.estado === "DEVUELTA" ? "Buen estado" : "Dañada");
    await expect(comprobante.locator("li")).toContainText("Revisión de prueba");
    if (caso.estado === "DEVUELTA") await expect(comprobante.locator("li")).toContainText("tú reportaste: dañada");
    await expect(tarjeta.getByRole("button", { name: "Devolver", exact: true })).toHaveCount(0);
  }
  await page.reload();
  await page.getByRole("tab", { name: "Historial (3)", exact: true }).click();
  await expect(ui.tarjeta(casos[2].nombre).locator(".garantia")).toContainText("Motivo: Prenda dañada según inspección RTM");
  await expect(ui.tarjeta(casos[1].nombre).locator(".garantia")).toContainText("Garantía devuelta: S/ 20.00");
});
