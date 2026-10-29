import { test, expect } from "./fixtures/catalogo";
import { CatalogoPage } from "./pages/CatalogoPage";
import { AMedidaPage } from "./pages/AMedidaPage";
import { CarritoPage } from "./pages/CarritoPage";

test("TC-E2E-RES-01: el carrito cuenta el plazo y retira la reserva vencida conservando artículos normales", async ({ page, catalogo }) => {
  await page.clock.install();
  const normal = await catalogo.crear("artículo normal");
  const donante = await catalogo.crear("donante reserva");
  const camisa = await catalogo.db.prenda.findFirstOrThrow({ where: { disfrazHogarId: donante.id } });
  const nombrePrenda = `${catalogo.prefijo} para reserva`;
  await catalogo.db.prenda.update({ where: { id: camisa.id }, data: { nombre: nombrePrenda } });
  const receta = await catalogo.db.receta.create({ data: {
    nombre: `${catalogo.prefijo} reserva`, precioDia: 40, palabrasClave: [`${catalogo.prefijo} reservable`],
    piezas: { create: { etiqueta: "Camisa reservada", tipo: "CAMISA", nombreContiene: nombrePrenda, obligatoria: true } },
  } });
  catalogo.recetasCreadas.push(receta.id);
  const uiCatalogo = new CatalogoPage(page);
  await uiCatalogo.iniciarSesion(catalogo.email, catalogo.password);
  await uiCatalogo.buscar(catalogo.prefijo);
  await uiCatalogo.agregar(normal.nombre);
  await page.getByRole("button", { name: "Cerrar carrito", exact: true }).click();
  const ui = new AMedidaPage(page);
  await ui.abrir();
  await ui.buscar(`${catalogo.prefijo} reservable`);
  const armado = ui.armado(receta.nombre);
  await armado.getByLabel("Tu talla de ropa", { exact: true }).selectOption("M");
  const reservar = armado.getByRole("button", { name: "Reservar y agregar al carrito", exact: true });
  await expect(reservar).toBeEnabled();
  const creada = page.waitForResponse(res => res.url().endsWith("/api/a-medida/reservar") && res.request().method() === "POST");
  await reservar.click();
  const respuesta = await creada;
  expect(respuesta.status()).toBe(201);
  const datos: { reservaId: string; disfrazId: string; nombre: string; segundosRestantes: number } = await respuesta.json();
  expect(datos.segundosRestantes).toBeGreaterThan(0);
  const carrito = new CarritoPage(page).dialogo;
  await expect(carrito).toBeVisible();
  await expect(carrito.locator(".carrito-drawer__items > li")).toHaveCount(2);
  await expect(carrito.getByText(datos.nombre, { exact: true })).toBeVisible();
  await expect(carrito.getByText(normal.nombre, { exact: true })).toBeVisible();
  const contador = carrito.getByRole("timer");
  await expect(contador).toHaveText(/^\d+:\d{2}$/);
  const segundos = (texto: string) => { const [m, s] = texto.split(":").map(Number); return m * 60 + s; };
  const inicial = segundos((await contador.textContent())!);
  await page.clock.fastForward(2000);
  await expect.poll(async () => segundos((await contador.textContent())!)).toBeLessThan(inicial);
  expect(await catalogo.db.prenda.findUniqueOrThrow({ where: { id: camisa.id } })).toMatchObject({ disfrazHogarId: donante.id, disfrazActualId: datos.disfrazId });
  expect(await catalogo.db.reserva.findUniqueOrThrow({ where: { id: datos.reservaId } })).toMatchObject({ usuarioId: catalogo.usuarioId, confirmadaEn: null, liberadaEn: null });

  // Prepara el mismo vencimiento en servidor y navegador; no simula respuestas de la API.
  await catalogo.db.reserva.update({ where: { id: datos.reservaId }, data: { vence: new Date(Date.now() - 1000) } });
  await page.clock.fastForward(datos.segundosRestantes * 1000 + 2000);
  await expect(carrito.getByText(datos.nombre, { exact: true })).toHaveCount(0);
  await expect(contador).toHaveCount(0);
  await expect(carrito.locator(".carrito-drawer__items > li")).toHaveCount(1);
  await expect(carrito.getByText(normal.nombre, { exact: true })).toBeVisible();
  await expect(carrito.getByRole("status")).toContainText("venció y se quitó del carrito");
  await expect(page.getByRole("button", { name: "Abrir carrito, 1 artículos", exact: true })).toBeVisible();
  // El listado real dispara la liberación del servidor: no basta con desaparecer de React.
  await page.getByRole("button", { name: "Cerrar carrito", exact: true }).click();
  const listado = page.waitForResponse(res => res.url().endsWith("/api/a-medida/reservas") && res.request().method() === "GET");
  await page.reload();
  const liberadas = await listado;
  expect(liberadas.status()).toBe(200);
  expect(await liberadas.json()).toEqual([]);
  expect(await catalogo.db.reserva.findUnique({ where: { id: datos.reservaId } })).toBeNull();
  expect(await catalogo.db.disfrazFisico.findUnique({ where: { id: datos.disfrazId } })).toBeNull();
  expect(await catalogo.db.movimientoPrenda.count({ where: { reservaId: datos.reservaId } })).toBe(0);
  expect(await catalogo.db.prenda.findUniqueOrThrow({ where: { id: camisa.id } })).toMatchObject({ disfrazHogarId: donante.id, disfrazActualId: donante.id });
  expect(await catalogo.db.alquiler.count({ where: { usuarioId: catalogo.usuarioId } })).toBe(0);
});
