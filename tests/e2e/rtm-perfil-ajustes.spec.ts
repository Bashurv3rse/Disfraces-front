import { test, expect } from "./fixtures/catalogo";
import { CatalogoPage } from "./pages/CatalogoPage";
import { AMedidaPage } from "./pages/AMedidaPage";
import { PerfilPage } from "./pages/PerfilPage";
import { CarritoPage } from "./pages/CarritoPage";

test("TC-E2E-PER-01: guardar tallas en el perfil las precarga al armar sin sobrescribirlas al cambiar la propuesta", async ({ page, catalogo }) => {
  const donante = await catalogo.crear("perfil donante");
  const prenda = await catalogo.db.prenda.findFirstOrThrow({ where: { disfrazHogarId: donante.id } });
  const filtro = `${catalogo.prefijo} perfil`;
  await catalogo.db.prenda.update({ where: { id: prenda.id }, data: { nombre: `${filtro} camisa` } });
  await catalogo.db.prenda.create({ data: { nombre: `${filtro} zapatos`, tipo: "ZAPATO", talla: "38", color: "azul", disfrazHogarId: donante.id, disfrazActualId: donante.id } });
  const receta = await catalogo.db.receta.create({ data: {
    nombre: `${catalogo.prefijo} perfil`, precioDia: 45, palabrasClave: [catalogo.prefijo],
    piezas: { create: [
      { etiqueta: "Camisa perfil", tipo: "CAMISA", nombreContiene: filtro },
      { etiqueta: "Zapatos perfil", tipo: "ZAPATO", nombreContiene: filtro },
    ] },
  } });
  catalogo.recetasCreadas.push(receta.id);
  await new CatalogoPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const perfil = new PerfilPage(page);
  await perfil.abrir();
  await expect(page.getByLabel("Talla de ropa", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Talla de calzado", { exact: true })).toHaveValue("");
  await perfil.guardarTallas("M", "38");
  await page.reload();
  await expect(page.getByLabel("Talla de ropa", { exact: true })).toHaveValue("M");
  await expect(page.getByLabel("Talla de calzado", { exact: true })).toHaveValue("38");
  const ui = new AMedidaPage(page);
  await ui.abrir();
  const propuesta = page.waitForResponse(res => res.url().endsWith("/api/a-medida/previsualizar") && res.request().postDataJSON().recetaId === receta.id);
  await ui.buscar(catalogo.prefijo);
  const armado = ui.armado(receta.nombre);
  await expect(armado.getByLabel("Tu talla de ropa", { exact: true })).toHaveValue("M");
  await expect(armado.getByLabel("Tu talla de calzado", { exact: true })).toHaveValue("38");
  const respuesta = await propuesta;
  expect(respuesta.status()).toBe(200);
  expect(respuesta.request().postDataJSON().tallas).toEqual({ ropa: "M", calzado: "38" });
  expect(await respuesta.json()).toMatchObject({ completo: true });
  await expect(armado.locator(".amedida__piezas")).toContainText(`${filtro} camisa`);
  await expect(armado.locator(".amedida__piezas")).toContainText(`${filtro} zapatos`);
  await armado.getByLabel("Tu talla de ropa", { exact: true }).selectOption("L");
  await expect(armado.getByLabel("Tu talla de ropa", { exact: true })).toHaveValue("L");
  await perfil.abrir();
  await expect(page.getByLabel("Talla de ropa", { exact: true })).toHaveValue("M");
  expect(await catalogo.db.usuario.findUniqueOrThrow({ where: { id: catalogo.usuarioId } })).toMatchObject({ tallaRopa: "M", tallaCalzado: "38" });
  expect(await catalogo.db.reserva.count({ where: { usuarioId: catalogo.usuarioId } })).toBe(0);
});

test("TC-E2E-AJU-01: solicitar ajuste desde el catálogo reserva las tallas y cancelar restaura las prendas", async ({ page, catalogo }) => {
  const destino = await catalogo.crear("destino ajuste");
  const donante = await catalogo.crear("donante ajuste");
  await catalogo.db.disfrazFisico.updateMany({ where: { id: { in: [destino.id, donante.id] } }, data: { familia: catalogo.prefijo, grupoCompatibilidad: catalogo.prefijo } });
  const original = await catalogo.db.prenda.findFirstOrThrow({ where: { disfrazHogarId: destino.id } });
  const reemplazo = await catalogo.db.prenda.findFirstOrThrow({ where: { disfrazHogarId: donante.id } });
  await catalogo.db.prenda.update({ where: { id: reemplazo.id }, data: { talla: "L" } });
  const ui = new CatalogoPage(page);
  await ui.iniciarSesion(catalogo.email, catalogo.password);
  await ui.buscar(catalogo.prefijo);
  const abrir = () => ui.tarjeta(destino.nombre).getByRole("button", { name: "Ajustar a mi talla", exact: true }).click();
  await abrir();
  const modal = page.getByRole("dialog", { name: `Ajustar ${destino.nombre} a mi talla`, exact: true });
  const confirmar = modal.getByRole("button", { name: "Reservar con mis tallas y agregar al carrito", exact: true });
  await expect(confirmar).toBeDisabled();
  const falta = page.waitForResponse(res => res.url().endsWith("/api/ajuste-talla/previsualizar") && res.request().postDataJSON().tallas.ropa === "XL");
  await modal.getByLabel("Tu talla de ropa", { exact: true }).selectOption("XL");
  expect((await falta).status()).toBe(200);
  await expect(modal.getByRole("alert")).toContainText("No se puede ajustar");
  await expect(confirmar).toBeDisabled();
  await modal.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(await catalogo.db.reserva.count({ where: { usuarioId: catalogo.usuarioId } })).toBe(0);
  expect((await catalogo.db.prenda.findUniqueOrThrow({ where: { id: reemplazo.id } })).disfrazActualId).toBe(donante.id);
  await abrir();
  const propuesta = page.waitForResponse(res => res.url().endsWith("/api/ajuste-talla/previsualizar") && res.request().postDataJSON().tallas.ropa === "L");
  await modal.getByLabel("Tu talla de ropa", { exact: true }).selectOption("L");
  const vista = await propuesta;
  expect(vista.status()).toBe(200);
  expect(await vista.json()).toMatchObject({ completo: true, cambios: 1 });
  await expect(modal.locator(".ajuste-piezas")).toContainText("talla M → L");
  const reservada = page.waitForResponse(res => res.url().endsWith("/api/ajuste-talla/reservar") && res.request().method() === "POST");
  await confirmar.click();
  const respuesta = await reservada;
  expect(respuesta.status()).toBe(201);
  const datos: { reservaId: string; disfrazId: string } = await respuesta.json();
  expect(datos.disfrazId).toBe(destino.id);
  await expect(modal).toHaveCount(0);
  const carrito = new CarritoPage(page).dialogo;
  await expect(carrito.getByText(destino.nombre, { exact: true })).toBeVisible();
  await expect(carrito.getByRole("timer")).toBeVisible();
  await expect(carrito.locator(".carrito-drawer__piezas")).toContainText("talla L");
  expect(await catalogo.db.reserva.findUniqueOrThrow({ where: { id: datos.reservaId } })).toMatchObject({ tipo: "AJUSTE_TALLA", usuarioId: catalogo.usuarioId, disfrazFisicoId: destino.id, tallaRopa: "L", confirmadaEn: null });
  expect((await catalogo.db.prenda.findUniqueOrThrow({ where: { id: original.id } })).disfrazActualId).toBe(donante.id);
  expect((await catalogo.db.prenda.findUniqueOrThrow({ where: { id: reemplazo.id } })).disfrazActualId).toBe(destino.id);
  expect(await catalogo.db.movimientoPrenda.count({ where: { reservaId: datos.reservaId } })).toBe(2);
  const cancelada = page.waitForResponse(res => res.url().endsWith(`/api/a-medida/reservas/${datos.reservaId}`) && res.request().method() === "DELETE");
  await carrito.getByRole("button", { name: `Quitar ${destino.nombre} del carrito y cancelar su reserva`, exact: true }).click();
  expect((await cancelada).status()).toBe(204);
  await expect(carrito.getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
  expect(await catalogo.db.reserva.findUnique({ where: { id: datos.reservaId } })).toBeNull();
  expect(await catalogo.db.movimientoPrenda.count({ where: { reservaId: datos.reservaId } })).toBe(0);
  expect((await catalogo.db.prenda.findUniqueOrThrow({ where: { id: original.id } })).disfrazActualId).toBe(destino.id);
  expect((await catalogo.db.prenda.findUniqueOrThrow({ where: { id: reemplazo.id } })).disfrazActualId).toBe(donante.id);
  expect(await catalogo.db.disfrazFisico.findUnique({ where: { id: destino.id } })).not.toBeNull();
  expect(await catalogo.db.alquiler.count({ where: { usuarioId: catalogo.usuarioId } })).toBe(0);
});
