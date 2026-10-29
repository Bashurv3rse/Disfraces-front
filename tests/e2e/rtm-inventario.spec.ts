import { test, expect } from "./fixtures/catalogo";
import { AdminPage } from "./pages/AdminPage";
import { InventarioPage } from "./pages/InventarioPage";

test.use({ catalogoRol: "ADMINISTRADOR" });

test("TC-E2E-INV-01: confirmar reemplazo actualiza destino y donante y persiste al recargar", async ({ page, catalogo }) => {
  const destino = await catalogo.crear("destino");
  const donante = await catalogo.crear("donante libre");
  const ocupado = await catalogo.crear("donante alquilado");
  await catalogo.db.disfrazFisico.updateMany({ where: { id: { in: [destino.id, donante.id, ocupado.id] } }, data: { grupoCompatibilidad: catalogo.prefijo } });
  const requerida = await catalogo.db.prenda.findFirstOrThrow({ where: { disfrazHogarId: destino.id } });
  const repuesto = await catalogo.db.prenda.findFirstOrThrow({ where: { disfrazHogarId: donante.id } });
  await catalogo.db.prenda.update({ where: { id: requerida.id }, data: { estado: "DANADA" } });
  const ahora = new Date();
  await catalogo.db.alquiler.create({ data: {
    usuarioId: catalogo.usuarioId, fechaInicio: new Date(+ahora - 86_400_000), fechaFin: new Date(+ahora + 86_400_000),
    montoTotal: 80, estado: "ACTIVO", disfraces: { create: { disfrazFisicoId: ocupado.id, precioUnitario: 40 } },
  } });
  await new AdminPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const ui = new InventarioPage(page);
  await ui.abrir(catalogo.prefijo);
  await ui.seleccionar(destino.nombre);
  await expect(ui.estado(destino.nombre)).toHaveText("1 falt.");
  await expect(ui.estado(donante.nombre)).toHaveText("Disponible");
  await expect(ui.estado(ocupado.nombre)).toHaveText("Alquilado");
  await expect(ui.detalle.getByText("Dañada", { exact: true })).toBeVisible();
  await ui.detalle.getByRole("button", { name: "Buscar reemplazo →", exact: true }).click();
  const modal = page.getByRole("dialog");
  await expect(ui.candidato(ocupado.nombre).getByRole("button", { name: "Confirmar préstamo", exact: true })).toBeDisabled();
  await expect(ui.candidato(donante.nombre).getByRole("button", { name: "Confirmar préstamo", exact: true })).toBeEnabled();
  // Cerrar la selección no debe mover ninguna prenda.
  await modal.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(modal).toHaveCount(0);
  expect(await catalogo.db.prenda.findUniqueOrThrow({ where: { id: repuesto.id } })).toMatchObject({ disfrazActualId: donante.id });
  expect(await catalogo.db.sustitucion.count({ where: { disfrazDestinoId: destino.id } })).toBe(0);
  await ui.detalle.getByRole("button", { name: "Buscar reemplazo →", exact: true }).click();
  const prestamo = page.waitForResponse(res => res.url().endsWith(`/api/disfraces/prendas/${requerida.id}/prestamo`) && res.request().method() === "POST");
  await ui.candidato(donante.nombre).getByRole("button", { name: "Confirmar préstamo", exact: true }).click();
  expect((await prestamo).status()).toBe(201);
  await expect(modal).toHaveCount(0);
  await expect(ui.estado(destino.nombre)).toHaveText("Disponible");
  await expect(ui.estado(donante.nombre)).toHaveText("1 falt.");
  await expect(ui.detalle.getByText("Reemplazada", { exact: true })).toBeVisible();
  await expect(ui.detalle.locator(".inventario__prenda-nota")).toContainText(donante.nombre);
  await ui.seleccionar(donante.nombre);
  await expect(ui.detalle.getByText("Prestada", { exact: true })).toBeVisible();
  await expect(ui.detalle.locator(".inventario__prenda-nota")).toContainText(destino.nombre);
  await page.reload();
  await page.getByRole("textbox", { name: "Buscar disfraz", exact: true }).fill(catalogo.prefijo);
  await expect(ui.estado(destino.nombre)).toHaveText("Disponible");
  await expect(ui.estado(donante.nombre)).toHaveText("1 falt.");
  await ui.seleccionar(destino.nombre);
  await expect(ui.detalle.getByText("Reemplazada", { exact: true })).toBeVisible();
  expect(await catalogo.db.prenda.findUniqueOrThrow({ where: { id: repuesto.id } })).toMatchObject({ disfrazHogarId: donante.id, disfrazActualId: destino.id });
  expect(await catalogo.db.sustitucion.findMany({ where: { disfrazDestinoId: destino.id } })).toEqual([
    expect.objectContaining({ prendaId: repuesto.id, disfrazOrigenId: donante.id, disfrazDestinoId: destino.id }),
  ]);
});

test("TC-E2E-INV-02: alquiler vigente o vencido oculta edición y muestra el aviso de bloqueo", async ({ page, catalogo }) => {
  const libre = await catalogo.crear("control libre");
  const bloqueados: Array<{ id: string; nombre: string }> = [];
  for (const vencido of [false, true]) {
    const disfraz = await catalogo.crear(vencido ? "alquiler vencido" : "alquiler vigente");
    bloqueados.push(disfraz);
    await catalogo.db.prenda.create({ data: {
      nombre: `Prenda dañada ${disfraz.nombre}`, tipo: "ACCESORIO", talla: "M", color: "azul", estado: "DANADA",
      disfrazHogarId: disfraz.id, disfrazActualId: disfraz.id,
    } });
    const ahora = new Date();
    await catalogo.db.alquiler.create({ data: {
      usuarioId: catalogo.usuarioId, fechaInicio: new Date(+ahora - 3 * 86_400_000),
      fechaFin: new Date(+ahora + (vencido ? -1 : 1) * 86_400_000), estado: "ACTIVO", montoTotal: 80,
      disfraces: { create: { disfrazFisicoId: disfraz.id, precioUnitario: 40 } },
    } });
  }
  const mutaciones: string[] = [];
  page.on("request", req => {
    if (new URL(req.url()).pathname.startsWith("/api/disfraces/") && ["POST", "PATCH", "PUT", "DELETE"].includes(req.method())) mutaciones.push(req.url());
  });
  await new AdminPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const ui = new InventarioPage(page);
  await ui.abrir(catalogo.prefijo);
  // Control positivo: el mismo administrador sí ve acciones cuando el disfraz está libre.
  await ui.seleccionar(libre.nombre);
  await expect(ui.detalle.getByRole("button", { name: "Marcar faltante", exact: true })).toBeEnabled();
  await expect(ui.detalle.getByRole("button", { name: "Marcar en reparación", exact: true })).toBeEnabled();
  await expect(ui.detalle.locator(".inventario__bloqueado-aviso")).toHaveCount(0);
  for (const disfraz of bloqueados) {
    await test.step(disfraz.nombre, async () => {
      await ui.seleccionar(disfraz.nombre);
      await expect(ui.estado(disfraz.nombre)).toHaveText("Alquilado");
      await expect(ui.detalle.locator(".inventario__bloqueado-aviso")).toContainText("no se puede modificar hasta que el cliente lo devuelva a la tienda");
      await expect(ui.detalle.getByText("Presente", { exact: true })).toBeVisible();
      await expect(ui.detalle.getByText("Dañada", { exact: true })).toBeVisible();
      await expect(ui.detalle.getByRole("button")).toHaveCount(0);
      await page.reload();
      await page.getByRole("textbox", { name: "Buscar disfraz", exact: true }).fill(catalogo.prefijo);
      await ui.seleccionar(disfraz.nombre);
      await expect(ui.detalle.locator(".inventario__bloqueado-aviso")).toBeVisible();
      await expect(ui.detalle.getByRole("button")).toHaveCount(0);
      expect(await catalogo.db.prenda.count({ where: { disfrazHogarId: disfraz.id, estado: "DANADA" } })).toBe(1);
    });
  }
  expect(mutaciones).toEqual([]);
});
