import { test, expect } from "./fixtures/catalogo";
import { AdminPage } from "./pages/AdminPage";
import { CrearDisfrazPage } from "./pages/CrearDisfrazPage";
import { InventarioPage } from "./pages/InventarioPage";

test.use({ catalogoRol: "ADMINISTRADOR" });

test("TC-E2E-ADM-01: crear un disfraz desde el panel valida prendas y persiste en inventario", async ({ page, catalogo }) => {
  await new AdminPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const ui = new CrearDisfrazPage(page);
  await ui.abrir();
  const nombre = `${catalogo.prefijo} nuevo #1`;
  await ui.formulario.getByLabel("Nombre de este disfraz", { exact: true }).fill(nombre);
  await ui.formulario.getByLabel("Familia", { exact: true }).fill(`${catalogo.prefijo} familia`);
  await ui.formulario.getByLabel("Tipo de disfraz", { exact: true }).fill("Fantasía RTM");
  await ui.formulario.getByLabel("Temporada o evento", { exact: true }).fill("Evento RTM");
  await ui.formulario.getByLabel("Precio por día (S/)", { exact: true }).fill("60");
  await ui.formulario.getByLabel("Grupo de compatibilidad", { exact: true }).fill(catalogo.prefijo);
  await ui.formulario.getByRole("button", { name: "Crear disfraz", exact: true }).click();
  expect(await ui.formulario.getByLabel("Nombre de la prenda 1", { exact: true }).evaluate(el => (el as HTMLInputElement).validity.valueMissing)).toBe(true);
  expect(await catalogo.db.disfrazFisico.count({ where: { nombre } })).toBe(0);
  await ui.prenda(1, "Camisa nueva RTM", "CAMISA", "M");
  await ui.formulario.getByRole("button", { name: "+ Agregar prenda", exact: true }).click();
  await ui.prenda(2, "Zapatos nuevos RTM", "ZAPATO", "38");
  const creacion = page.waitForResponse(res => res.url().endsWith("/api/disfraces") && res.request().method() === "POST");
  await ui.formulario.getByRole("button", { name: "Crear disfraz", exact: true }).click();
  const respuesta = await creacion;
  expect(respuesta.status()).toBe(201);
  const creada: { id: string } = await respuesta.json();
  catalogo.disfracesCreados.push(creada.id);
  await expect(page.getByRole("heading", { name: "Disfraz creado", exact: true })).toBeVisible();
  await expect(page.locator(".crear__exito")).toContainText(nombre);
  await expect(page.locator(".crear__exito")).toContainText("2 prenda(s)");
  const guardado = await catalogo.db.disfrazFisico.findUniqueOrThrow({ where: { id: creada.id }, include: { prendasHogar: true } });
  expect(Number(guardado.precioAlquiler)).toBe(60);
  expect(guardado).toMatchObject({ nombre, familia: `${catalogo.prefijo} familia`, grupoCompatibilidad: catalogo.prefijo, tipoDisfraz: "Fantasía RTM", temporadaEvento: "evento rtm", origen: "CATALOGO" });
  expect(guardado.prendasHogar).toHaveLength(2);
  expect(guardado.prendasHogar).toEqual(expect.arrayContaining([
    expect.objectContaining({ nombre: "Camisa nueva RTM", tipo: "CAMISA", talla: "M", disfrazActualId: creada.id }),
    expect.objectContaining({ nombre: "Zapatos nuevos RTM", tipo: "ZAPATO", talla: "38", disfrazActualId: creada.id }),
  ]));
  await page.getByRole("link", { name: "Ver en Inventario Físico", exact: true }).click();
  const inventario = new InventarioPage(page);
  await page.getByRole("textbox", { name: "Buscar disfraz", exact: true }).fill(catalogo.prefijo);
  await inventario.seleccionar(nombre);
  await expect(inventario.estado(nombre)).toHaveText("Disponible");
  await expect(inventario.detalle.locator(".inventario__prendas .inventario__prenda")).toHaveCount(2);
  await page.reload();
  await page.getByRole("textbox", { name: "Buscar disfraz", exact: true }).fill(catalogo.prefijo);
  await inventario.seleccionar(nombre);
  await expect(inventario.estado(nombre)).toHaveText("Disponible");
});
