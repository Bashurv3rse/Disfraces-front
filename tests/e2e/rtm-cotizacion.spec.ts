import { test, expect } from "./fixtures/catalogo";
import { CatalogoPage } from "./pages/CatalogoPage";
import { CarritoPage } from "./pages/CarritoPage";

test("TC-E2E-COT-01: cobertura parcial de descuento y cupón inactivo en la cotización del carrito", async ({ page, catalogo }) => {
  test.info().annotations.push({ type: "alcance parcial", description: "La administración de promociones no existe en la interfaz/API. La promoción se prepara y desactiva en Prisma; no se considera probado ese flujo administrativo." });
  const disfraz = await catalogo.crear("cotización con cupón");
  const codigo = `RTM${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const promocion = await catalogo.db.promocion.create({ data: {
    nombre: `${catalogo.prefijo} descuento 10`, descripcion: "Cupón exclusivo de prueba", porcentaje: 10, codigo,
    tipoDisfraz: `${catalogo.prefijo}-tipo`, activa: true,
  } });
  catalogo.promocionesCreadas.push(promocion.id);
  const ui = new CatalogoPage(page);
  await ui.iniciarSesion(catalogo.email, catalogo.password);
  await ui.buscar(catalogo.prefijo);
  await ui.agregar(disfraz.nombre);
  const carrito = new CarritoPage(page);
  const inicio = new Date(Date.now() + 7 * 86_400_000);
  const fin = new Date(+inicio + 3 * 86_400_000);
  const cotizacion = await carrito.fechas(inicio.toISOString().slice(0, 10), fin.toISOString().slice(0, 10));
  expect(await cotizacion.json(), "Requiere ausencia de ofertas automáticas aplicables; no se desactivan promociones ajenas").toMatchObject({ subtotal: 120, descuento: 0, totalAPagar: 150 });
  await carrito.dialogo.getByLabel("Código de descuento", { exact: true }).fill(codigo);
  const aplicada = page.waitForResponse(res => res.url().endsWith("/api/pagos/cotizar") && res.request().postDataJSON().codigo === codigo);
  await carrito.dialogo.getByRole("button", { name: "Aplicar", exact: true }).click();
  const respuesta = await aplicada;
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toMatchObject({ subtotal: 120, descuento: 12, totalAlquiler: 108, garantia: 27, totalAPagar: 135, codigo: { valido: true, aplicado: true } });
  await expect(carrito.linea("Descuento")).toContainText("S/ 12.00");
  await expect(carrito.linea("Garantía (25%, reembolsable)")).toContainText("S/ 27.00");
  await expect(carrito.linea("Total a pagar")).toContainText("S/ 135.00");
  await expect(carrito.dialogo.getByRole("button", { name: "Pagar · S/ 135.00", exact: true })).toBeEnabled();
  // Prepara el estado inactivo sin sustituir la administración pendiente por llamadas simuladas.
  await catalogo.db.promocion.update({ where: { id: promocion.id }, data: { activa: false } });
  await carrito.dialogo.getByRole("button", { name: "Quitar", exact: true }).click();
  await expect(carrito.dialogo.getByRole("button", { name: "Pagar · S/ 150.00", exact: true })).toBeEnabled();
  await carrito.dialogo.getByLabel("Código de descuento", { exact: true }).fill(codigo);
  const rechazada = page.waitForResponse(res => res.url().endsWith("/api/pagos/cotizar") && res.request().postDataJSON().codigo === codigo);
  await carrito.dialogo.getByRole("button", { name: "Aplicar", exact: true }).click();
  const noValida = await rechazada;
  expect(noValida.status()).toBe(200);
  expect(await noValida.json()).toMatchObject({ descuento: 0, totalAPagar: 150, codigo: { valido: false, aplicado: false } });
  await expect(carrito.dialogo.getByRole("button", { name: "Pagar · S/ 150.00", exact: true })).toBeDisabled();
  await expect(carrito.dialogo.locator(".carrito-drawer__codigo-msg--error")).toBeVisible();
  expect(await catalogo.db.alquiler.count({ where: { usuarioId: catalogo.usuarioId } })).toBe(0);
});
