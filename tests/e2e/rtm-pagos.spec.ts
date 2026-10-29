import { test, expect } from "./fixtures/pagos";
import { CatalogoPage } from "./pages/CatalogoPage";
import { CarritoPage } from "./pages/CarritoPage";

interface SesionCapturada {
  id: string;
  parametros: {
    mode: string;
    line_items: Array<{ price_data: { currency: string; unit_amount: number; product_data: { name: string } }; quantity: number }>;
    metadata: { usuarioId: string; montoTotalCent: string; garantiaCent: string; descuentoCent: string; disfraces: string };
  };
}

// Solo el documento externo se intercepta: nunca se visita Stripe ni se escriben tarjetas.
async function interceptarCheckout(page: import("@playwright/test").Page) {
  await page.route("https://checkout.stripe.com/**", route => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Frontera Stripe simulada</title><h1>Destino externo de Checkout interceptado</h1>",
  }));
}

function rangoTresDias() {
  const inicio = new Date();
  inicio.setUTCDate(inicio.getUTCDate() + 7);
  const fin = new Date(inicio);
  fin.setUTCDate(fin.getUTCDate() + 3);
  return { inicio: inicio.toISOString().slice(0, 10), fin: fin.toISOString().slice(0, 10) };
}

test("TC-E2E-PAG-01: el sistema envía solo datos de alquiler y redirige a Checkout externo simulado", async ({ page, request, catalogo }) => {
  await interceptarCheckout(page);
  const disfraz = await catalogo.crear("checkout externo");
  const ui = new CatalogoPage(page);
  await ui.iniciarSesion(catalogo.email, catalogo.password);
  await ui.buscar(catalogo.prefijo);
  await ui.agregar(disfraz.nombre);
  const carrito = new CarritoPage(page);
  // No debe existir un formulario local de PAN, CVC ni vencimiento de tarjeta.
  await expect(page.locator('input[autocomplete="cc-number"],input[autocomplete="cc-csc"],input[autocomplete="cc-exp"],iframe[src*="stripe"]')).toHaveCount(0);
  await expect(carrito.dialogo.getByRole("button", { name: "Elige las fechas para pagar", exact: true })).toBeDisabled();
  const fechas = rangoTresDias();
  await carrito.fechas(fechas.inicio, fechas.fin);
  await carrito.dialogo.getByLabel("Ocasión / evento", { exact: true }).fill("Checkout RTM");
  const checkout = page.waitForResponse(res => res.url().endsWith("/api/pagos/crear-sesion") && res.request().method() === "POST");
  await carrito.dialogo.getByRole("button", { name: /^Pagar ·/ }).click();
  const respuesta = await checkout;
  expect(respuesta.status()).toBe(201);
  expect(respuesta.request().postDataJSON()).toEqual({ fechaInicio: fechas.inicio, fechaFin: fechas.fin, evento: "Checkout RTM", disfraces: [disfraz.id] });
  await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_rtm_/);
  const url = page.url();
  await expect(page.getByRole("heading", { name: "Destino externo de Checkout interceptado", exact: true })).toBeVisible();
  const id = new URL(url).pathname.split("/").pop();
  const captura = await request.get(`http://localhost:3000/__e2e/stripe/sesiones/${id}`);
  expect(captura.status()).toBe(200);
  const sesion: SesionCapturada = await captura.json();
  expect(sesion.parametros.mode).toBe("payment");
  expect(sesion.parametros.metadata.usuarioId).toBe(catalogo.usuarioId);
  expect(await catalogo.db.alquiler.count({ where: { usuarioId: catalogo.usuarioId } })).toBe(0);
});

test("TC-E2E-PAG-02: tres días a S/ 40 envían S/ 120 y S/ 30 de garantía a la frontera Stripe", async ({ page, request, catalogo }) => {
  await interceptarCheckout(page);
  const disfraz = await catalogo.crear("importe tres días");
  const fechas = rangoTresDias();
  const ui = new CatalogoPage(page);
  await ui.iniciarSesion(catalogo.email, catalogo.password);
  await ui.buscar(catalogo.prefijo);
  await ui.agregar(disfraz.nombre);
  const carrito = new CarritoPage(page);
  const cotizacion = await carrito.fechas(fechas.inicio, fechas.fin);
  expect(await cotizacion.json(), "Este escenario requiere un precio sin promociones aplicables; no se modifican promociones ajenas").toMatchObject({ dias: 3, subtotal: 120, descuento: 0, totalAlquiler: 120, garantia: 30, totalAPagar: 150 });
  await expect(carrito.linea("Subtotal (3 días)")).toContainText("S/ 120.00");
  await expect(carrito.linea("Garantía (25%, reembolsable)")).toContainText("S/ 30.00");
  await expect(carrito.linea("Total a pagar")).toContainText("S/ 150.00");
  const checkout = page.waitForResponse(res => res.url().endsWith("/api/pagos/crear-sesion") && res.request().method() === "POST");
  await carrito.dialogo.getByRole("button", { name: "Pagar · S/ 150.00", exact: true }).click();
  const respuesta = await checkout;
  expect(respuesta.status()).toBe(201);
  await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_rtm_/);
  const url = page.url();
  const id = new URL(url).pathname.split("/").pop();
  const captura = await request.get(`http://localhost:3000/__e2e/stripe/sesiones/${id}`);
  expect(captura.status()).toBe(200);
  const sesion: SesionCapturada = await captura.json();
  expect(sesion.parametros.line_items).toEqual([
    { price_data: { currency: "pen", product_data: { name: expect.stringContaining(disfraz.nombre) }, unit_amount: 12000 }, quantity: 1 },
    { price_data: { currency: "pen", product_data: { name: expect.stringContaining("Garantía") }, unit_amount: 3000 }, quantity: 1 },
  ]);
  expect(sesion.parametros.line_items.reduce((s, l) => s + l.price_data.unit_amount * l.quantity, 0)).toBe(15000);
  expect(sesion.parametros.metadata).toMatchObject({ usuarioId: catalogo.usuarioId, montoTotalCent: "12000", garantiaCent: "3000", descuentoCent: "0", disfraces: JSON.stringify([disfraz.id]) });
  expect(await catalogo.db.alquiler.count({ where: { usuarioId: catalogo.usuarioId } })).toBe(0);
});
