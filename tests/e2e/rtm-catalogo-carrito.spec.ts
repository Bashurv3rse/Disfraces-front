import { test, expect } from "./fixtures/catalogo";
import { CatalogoPage } from "./pages/CatalogoPage";

test("TC-E2E-CAT-01: combinar filtros, mostrar resultado vacío y limpiar desde el catálogo", async ({ page, catalogo }) => {
  // Dado un catálogo real con coincidencias y alternativas de tipo/temporada.
  const tipo = `${catalogo.prefijo}-elegido`;
  const temporada = `${catalogo.prefijo}-fiesta`;
  const elegido = await catalogo.crear("elegido", { tipo, temporada });
  const otroTipo = await catalogo.crear("otro tipo", { temporada });
  const otraTemporada = await catalogo.crear("otra temporada", { tipo });
  const ui = new CatalogoPage(page);
  await page.goto("/catalogo");
  await ui.buscar(catalogo.prefijo);
  await expect(ui.tarjeta(elegido.nombre)).toBeVisible();
  await expect(ui.tarjeta(otroTipo.nombre)).toBeVisible();
  await expect(ui.tarjeta(otraTemporada.nombre)).toBeVisible();
  await page.getByRole("checkbox", { name: tipo, exact: true }).check();
  const consulta = page.waitForResponse(res => {
    const url = new URL(res.url());
    return url.pathname === "/api/disfraces" && url.searchParams.get("tipos") === tipo && url.searchParams.get("temporadas") === temporada;
  });
  await page.getByRole("checkbox", { name: new RegExp(`^${temporada}$`, "i") }).check();
  expect((await consulta).status()).toBe(200);
  await expect(ui.tarjeta(elegido.nombre)).toBeVisible();
  await expect(ui.tarjeta(otroTipo.nombre)).toHaveCount(0);
  await expect(ui.tarjeta(otraTemporada.nombre)).toHaveCount(0);
  await expect(page.locator(".catalogo__grid > li")).toHaveCount(1);
  // Camino alterno: ningún resultado, sin perder la posibilidad de restablecer.
  await ui.buscar(`${catalogo.prefijo}-inexistente`);
  await expect(page.getByText("No se encontraron disfraces con estos filtros.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Buscar", exact: true })).toHaveValue("");
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
  for (const item of [elegido, otroTipo, otraTemporada]) await expect(ui.tarjeta(item.nombre)).toBeVisible();
});

test("TC-E2E-CAR-01: quitar un artículo conserva el otro y permite vaciar antes del pago", async ({ page, catalogo }) => {
  const primero = await catalogo.crear("primero");
  const segundo = await catalogo.crear("segundo");
  const ui = new CatalogoPage(page);
  const pagos: string[] = [];
  page.on("request", req => { if (req.url().includes("/pagos/crear-sesion")) pagos.push(req.url()); });
  await ui.iniciarSesion(catalogo.email, catalogo.password);
  await ui.buscar(catalogo.prefijo);
  await ui.agregar(primero.nombre);
  await page.getByRole("button", { name: "Cerrar carrito", exact: true }).click();
  await ui.agregar(segundo.nombre);
  const carrito = page.getByRole("dialog", { name: "Tu carrito" });
  await expect(carrito.locator(".carrito-drawer__items > li")).toHaveCount(2);
  await carrito.getByRole("button", { name: `Quitar ${primero.nombre} del carrito`, exact: true }).click();
  await expect(carrito.getByText(primero.nombre, { exact: true })).toHaveCount(0);
  await expect(carrito.getByText(segundo.nombre, { exact: true })).toBeVisible();
  await expect(carrito.locator(".carrito-drawer__items > li")).toHaveCount(1);
  await expect(carrito.locator(".carrito-drawer__resumen")).toContainText("S/ 40.00");
  await page.getByRole("button", { name: "Cerrar carrito", exact: true }).click();
  await expect(ui.tarjeta(primero.nombre).getByRole("button", { name: "Agregar al carrito", exact: true })).toBeEnabled();
  await expect(ui.tarjeta(segundo.nombre).getByRole("button", { name: "En el carrito", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: /Abrir carrito, 1 artículos/ }).click();
  await carrito.getByRole("button", { name: `Quitar ${segundo.nombre} del carrito`, exact: true }).click();
  await expect(carrito.getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
  await expect(carrito.getByRole("button", { name: /Pagar/ })).toHaveCount(0);
  expect(pagos).toEqual([]);
});

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220"><rect width="400" height="220" fill="navy"/></svg>';

test("TC-FE-IMG-01: imagen válida y reemplazo temático ante imagen ausente o rota", async ({ page, catalogo }) => {
  // Solo se controlan archivos de imagen; catálogo, autenticación y BD son reales.
  await page.route("**/rtm-imagen-valida.svg", route => route.fulfill({ contentType: "image/svg+xml", body: svg }));
  await page.route("**/rtm-imagen-rota.svg", route => route.fulfill({ status: 404, body: "Imagen inexistente" }));
  const valida = await catalogo.crear("imagen válida", { imagenUrl: "/rtm-imagen-valida.svg" });
  const ausente = await catalogo.crear("sin imagen");
  const rota = await catalogo.crear("imagen rota", { imagenUrl: "/rtm-imagen-rota.svg" });
  const ui = new CatalogoPage(page);
  await ui.iniciarSesion(catalogo.email, catalogo.password);
  await ui.buscar(catalogo.prefijo);
  const imagen = ui.tarjeta(valida.nombre).getByRole("img", { name: valida.nombre, exact: true });
  await expect(imagen).toBeVisible();
  await expect.poll(() => imagen.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  for (const item of [ausente, rota]) {
    const tarjeta = ui.tarjeta(item.nombre);
    await tarjeta.scrollIntoViewIfNeeded();
    await expect(tarjeta.locator(".catalogo__icono")).toBeVisible();
    await expect(tarjeta.getByRole("img")).toHaveCount(0);
    await expect(tarjeta.getByRole("heading", { name: item.nombre, exact: true })).toBeVisible();
    await expect(tarjeta.getByRole("button", { name: "Agregar al carrito", exact: true })).toBeEnabled();
  }
  await ui.agregar(rota.nombre);
  await expect(page.getByRole("dialog", { name: "Tu carrito" }).getByText(rota.nombre, { exact: true })).toBeVisible();
});

test("TC-FE-NFI-01: diferir imágenes fuera de pantalla y cargar Perfil al navegar a su ruta", async ({ page, catalogo }) => {
  await page.setViewportSize({ width: 1000, height: 600 });
  const solicitadas = new Set<string>();
  await page.route("**/rtm-lazy/*.svg", route => {
    solicitadas.add(new URL(route.request().url()).pathname);
    return route.fulfill({ contentType: "image/svg+xml", body: svg });
  });
  const modulosPerfil: string[] = [];
  page.on("request", req => {
    if (/\/src\/pages\/perfil\/Perfil\.tsx|\/assets\/Perfil-[^/]+\.js/.test(req.url())) modulosPerfil.push(req.url());
  });
  for (let i = 0; i < 40; i++) await catalogo.crear(`imagen ${String(i).padStart(2, "0")}`, { imagenUrl: `/rtm-lazy/${catalogo.prefijo}-${i}.svg` });
  const ui = new CatalogoPage(page);
  await ui.iniciarSesion(catalogo.email, catalogo.password);
  await ui.buscar(catalogo.prefijo);
  const imagenes = page.locator('.catalogo__grid img[src*="/rtm-lazy/"]');
  await expect(imagenes).toHaveCount(40);
  for (const imagen of await imagenes.all()) {
    await expect(imagen).toHaveAttribute("loading", "lazy");
    await expect(imagen).toHaveAttribute("decoding", "async");
  }
  const primera = imagenes.first();
  const ultima = imagenes.last();
  await expect.poll(() => primera.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const rutaUltima = new URL((await ultima.getAttribute("src"))!, page.url()).pathname;
  expect(solicitadas.has(rutaUltima), "La imagen alejada no debe descargarse al inicio").toBe(false);
  await ultima.scrollIntoViewIfNeeded();
  await expect.poll(() => solicitadas.has(rutaUltima)).toBe(true);
  await expect.poll(() => ultima.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(modulosPerfil).toEqual([]);
  await page.getByTitle("Mi perfil", { exact: true }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByLabel(/correo/i)).toHaveValue(catalogo.email);
  await expect.poll(() => modulosPerfil.length).toBeGreaterThan(0);
});
