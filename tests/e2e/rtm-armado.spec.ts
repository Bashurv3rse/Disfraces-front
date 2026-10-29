import { test, expect } from "./fixtures/catalogo";
import { CatalogoPage } from "./pages/CatalogoPage";
import { AMedidaPage } from "./pages/AMedidaPage";

test("TC-E2E-ARM-01: elegir tallas muestra piezas reales y permite corregir una talla sin existencias", async ({ page, catalogo }) => {
  const donante = await catalogo.crear("donante armado");
  const prendaM = await catalogo.db.prenda.findFirstOrThrow({ where: { disfrazHogarId: donante.id } });
  const nombreBase = `${catalogo.prefijo} armado`;
  await catalogo.db.prenda.update({ where: { id: prendaM.id }, data: { nombre: `${nombreBase} blusa M` } });
  for (const pieza of [
    { nombre: `${nombreBase} blusa L`, tipo: "CAMISA" as const, talla: "L" },
    { nombre: `${nombreBase} zapatos 38`, tipo: "ZAPATO" as const, talla: "38" },
  ]) await catalogo.db.prenda.create({ data: { ...pieza, color: "azul", disfrazHogarId: donante.id, disfrazActualId: donante.id } });
  const receta = await catalogo.db.receta.create({ data: {
    nombre: `${catalogo.prefijo} armado`, precioDia: 50, palabrasClave: [catalogo.prefijo],
    piezas: { create: [
      { etiqueta: "Blusa de prueba", tipo: "CAMISA", nombreContiene: nombreBase, obligatoria: true },
      { etiqueta: "Zapatos de prueba", tipo: "ZAPATO", nombreContiene: nombreBase, obligatoria: true },
      { etiqueta: "Pañuelo opcional", tipo: "PANUELO", nombreContiene: nombreBase, obligatoria: false },
    ] },
  }, include: { piezas: true } });
  catalogo.recetasCreadas.push(receta.id);
  await new CatalogoPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const ui = new AMedidaPage(page);
  await ui.abrir();
  await ui.buscar(catalogo.prefijo);
  // La coincidencia única abre el armado automáticamente; no se añade nada al carrito.
  const armado = ui.armado(receta.nombre);
  await expect(armado).toBeVisible();
  const reservar = armado.getByRole("button", { name: "Reservar y agregar al carrito", exact: true });
  await expect(reservar).toBeDisabled();
  await armado.getByLabel("Tu talla de ropa", { exact: true }).selectOption("M");
  await expect(armado.getByText("Elige tus tallas para ver qué piezas te corresponden.", { exact: true })).toBeVisible();
  await expect(reservar).toBeDisabled();
  const esPropuesta = (res: import("@playwright/test").Response) => res.url().endsWith("/api/a-medida/previsualizar") && res.request().method() === "POST";
  const primera = page.waitForResponse(esPropuesta);
  await armado.getByLabel("Tu talla de calzado", { exact: true }).selectOption("38");
  const respuesta = await primera;
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toMatchObject({
    receta: { id: receta.id, precioDia: 50 }, completo: true, faltantes: [],
    piezas: expect.arrayContaining([
      expect.objectContaining({ etiqueta: "Blusa de prueba", nombre: `${nombreBase} blusa M`, talla: "M", color: "azul" }),
      expect.objectContaining({ etiqueta: "Zapatos de prueba", nombre: `${nombreBase} zapatos 38`, talla: "38" }),
    ]),
  });
  await expect(armado.locator(".amedida__piezas > li")).toHaveCount(2);
  await expect(armado.locator(".amedida__piezas")).toContainText(`${nombreBase} blusa M`);
  await expect(armado.locator(".amedida__piezas")).toContainText(`${nombreBase} zapatos 38`);
  await expect(armado.locator(".amedida__omitidas")).toContainText("pañuelo opcional");
  await expect(armado.locator(".amedida__precio")).toHaveText("S/ 50.00 por día");
  await expect(reservar).toBeEnabled();
  const cambio = page.waitForResponse(esPropuesta);
  await armado.getByLabel("Tu talla de ropa", { exact: true }).selectOption("L");
  expect((await cambio).status()).toBe(200);
  await expect(armado.locator(".amedida__piezas")).toContainText(`${nombreBase} blusa L`);
  await expect(armado.locator(".amedida__piezas")).not.toContainText(`${nombreBase} blusa M`);
  const sinTalla = page.waitForResponse(esPropuesta);
  await armado.getByLabel("Tu talla de ropa", { exact: true }).selectOption("XL");
  const sinExistencias = await sinTalla;
  expect(sinExistencias.status()).toBe(200);
  expect(await sinExistencias.json()).toMatchObject({ completo: false, faltantes: expect.arrayContaining([expect.objectContaining({ etiqueta: "Blusa de prueba", tallaPedida: "XL", tallasDisponibles: ["M", "L"] })]) });
  const faltante = armado.getByRole("alert").filter({ hasText: "Falta: Blusa de prueba." });
  await expect(faltante).toBeVisible();
  await expect(reservar).toBeDisabled();
  const corregida = page.waitForResponse(esPropuesta);
  await faltante.getByRole("button", { name: "M", exact: true }).click();
  const correccion = await corregida;
  expect(correccion.status()).toBe(200);
  expect(correccion.request().postDataJSON().tallas.ajustes).toEqual({ [receta.piezas.find(p => p.tipo === "CAMISA")!.id]: "M" });
  expect(await correccion.json()).toMatchObject({ completo: true, faltantes: [] });
  await expect(faltante).toHaveCount(0);
  await expect(armado.locator(".amedida__piezas")).toContainText(`${nombreBase} blusa M`);
  await expect(reservar).toBeEnabled();
  // Previsualizar no reserva ni cambia la ubicación de las prendas propias.
  expect(await catalogo.db.reserva.count({ where: { usuarioId: catalogo.usuarioId } })).toBe(0);
  expect(await catalogo.db.prenda.count({ where: { disfrazHogarId: donante.id, disfrazActualId: donante.id } })).toBe(3);
  await expect(page.getByRole("button", { name: "Abrir carrito, 0 artículos", exact: true })).toBeVisible();
});
