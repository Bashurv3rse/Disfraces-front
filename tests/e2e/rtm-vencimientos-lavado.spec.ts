import { test, expect } from "./fixtures/catalogo";
import { CatalogoPage } from "./pages/CatalogoPage";
import { AdminPage } from "./pages/AdminPage";
import { InventarioPage } from "./pages/InventarioPage";
import { MisAlquileresPage } from "./pages/MisAlquileresPage";

test("TC-E2E-DEV-01: alerta de alquiler vencido con límites ayer, hoy y mañana", async ({ page, catalogo }) => {
  const ahora = new Date();
  const hoy = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
  const dia = 86_400_000;
  async function crear(sufijo: string, fin: Date, estado: "ACTIVO" | "FINALIZADO" = "ACTIVO") {
    const disfraz = await catalogo.crear(sufijo);
    return catalogo.db.alquiler.create({ data: {
      usuarioId: catalogo.usuarioId, evento: `${catalogo.prefijo} ${sufijo}`, estado,
      fechaInicio: new Date(+hoy - 3 * dia), fechaFin: fin, montoTotal: 80, montoGarantia: 20,
      disfraces: { create: { disfrazFisicoId: disfraz.id, precioUnitario: 40 } },
    } });
  }
  const terminaHoy = await crear("termina hoy", hoy);
  const terminaManana = await crear("termina mañana", new Date(+hoy + dia));
  const finalizado = await crear("ya finalizado", new Date(+hoy - dia), "FINALIZADO");
  await new CatalogoPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const ui = new MisAlquileresPage(page);
  await ui.abrir();
  await expect(page.getByRole("tab", { name: "Activos (2)", exact: true })).toBeVisible();
  await expect(ui.tarjeta(terminaHoy.evento!)).toBeVisible();
  await expect(ui.tarjeta(terminaManana.evento!)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".alquiler-card__vencido-aviso")).toHaveCount(0);
  // N-1, N y N+1: solo ayer debe disparar el aviso, aunque hoy siga ACTIVO.
  const vencido = await crear("venció ayer", new Date(+hoy - dia));
  await page.reload();
  await expect(page.getByRole("alert")).toHaveText("Tienes 1 alquiler(es) con la fecha de devolución vencida. Devuélvelo(s) cuanto antes.");
  await expect(ui.tarjeta(vencido.evento!).locator(".alquiler-card__vencido-aviso")).toContainText("La fecha de devolución ya pasó");
  await expect(ui.tarjeta(terminaHoy.evento!).locator(".alquiler-card__vencido-aviso")).toHaveCount(0);
  await expect(ui.tarjeta(terminaManana.evento!).locator(".alquiler-card__vencido-aviso")).toHaveCount(0);
  await expect(page.locator(".alquiler-card--vencido")).toHaveCount(1);
  await page.getByRole("tab", { name: "Historial (1)", exact: true }).click();
  await expect(ui.tarjeta(finalizado.evento!)).toBeVisible();
  await expect(ui.tarjeta(finalizado.evento!).locator(".alquiler-card__vencido-aviso")).toHaveCount(0);
  // Al dejar de estar activo, el vencido ya no debe alimentar la alerta.
  await catalogo.db.alquiler.update({ where: { id: vencido.id }, data: { estado: "FINALIZADO" } });
  await page.reload();
  await expect(page.getByRole("tab", { name: "Activos (2)", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".alquiler-card--vencido")).toHaveCount(0);
});

test.describe("Fase de lavado en inventario", () => {
  test.use({ catalogoRol: "ADMINISTRADOR" });

  test("TC-E2E-LAV-01: mostrar Lavado (día 1/3) y retirar la fase al finalizar el ciclo", async ({ page, catalogo }) => {
    const lavado = await catalogo.crear("en lavado");
    const libre = await catalogo.crear("libre sin lavado");
    const reparacion = await catalogo.crear("en reparación");
    await catalogo.db.disfrazFisico.update({ where: { id: lavado.id }, data: { estadoManual: "SUSPENDIDO", fechaSuspension: new Date() } });
    await catalogo.db.disfrazFisico.update({ where: { id: reparacion.id }, data: { estadoManual: "EN_REPARACION" } });
    await new AdminPage(page).iniciarSesion(catalogo.email, catalogo.password);
    const ui = new InventarioPage(page);
    await ui.abrir(catalogo.prefijo);
    await expect(ui.estado(lavado.nombre)).toHaveText("Lavado (día 1/3)");
    await expect(ui.estado(libre.nombre)).toHaveText("Disponible");
    await expect(ui.estado(reparacion.nombre)).toHaveText("En reparación");
    const consulta = page.waitForResponse(res => res.url().endsWith(`/api/disfraces/${lavado.id}/inventario`));
    await ui.seleccionar(lavado.nombre);
    const respuesta = await consulta;
    expect(respuesta.status()).toBe(200);
    expect(await respuesta.json()).toMatchObject({ id: lavado.id, estado: "SUSPENDIDO", faseLavado: "LAVADO" });
    await expect(ui.detalle.locator(".inventario__detalle-titulo .inventario__estado-badge")).toHaveText("Lavado (día 1/3)");
    await page.reload();
    await page.getByRole("textbox", { name: "Buscar disfraz", exact: true }).fill(catalogo.prefijo);
    await ui.seleccionar(lavado.nombre);
    await expect(ui.estado(lavado.nombre)).toHaveText("Lavado (día 1/3)");
    await expect(ui.detalle.locator(".inventario__detalle-titulo .inventario__estado-badge")).toHaveText("Lavado (día 1/3)");
    // Diez días naturales garantizan que transcurrieron más de tres hábiles, incluso con fin de semana.
    await catalogo.db.disfrazFisico.update({ where: { id: lavado.id }, data: { fechaSuspension: new Date(Date.now() - 10 * 86_400_000) } });
    await page.reload();
    await page.getByRole("textbox", { name: "Buscar disfraz", exact: true }).fill(catalogo.prefijo);
    await expect(ui.estado(lavado.nombre)).toHaveText("Disponible");
    await ui.seleccionar(lavado.nombre);
    await expect(ui.detalle.locator(".inventario__detalle-titulo .inventario__estado-badge")).toHaveText("Disponible");
    expect(await catalogo.db.disfrazFisico.findUniqueOrThrow({ where: { id: lavado.id } })).toMatchObject({ estadoManual: null, fechaSuspension: null });
  });
});
