import { test, expect } from "./fixtures/catalogo";
import { AdminPage } from "./pages/AdminPage";
import { RecetasPage } from "./pages/RecetasPage";

test.use({ catalogoRol: "ADMINISTRADOR" });

test("TC-E2E-PED-01: revisar demanda y vincular pedidos al crear una receta desde el panel", async ({ page, catalogo }) => {
  const texto = `pedido${catalogo.prefijo.replaceAll("-", "")}`;
  const otro = `otro${catalogo.prefijo.replaceAll("-", "")}`;
  await catalogo.db.peticionDisfraz.createMany({ data: [
    { usuarioId: catalogo.usuarioId, texto, textoNormalizado: texto, creadoEn: new Date(Date.now() - 11 * 60_000) },
    { usuarioId: catalogo.usuarioId, texto, textoNormalizado: texto },
    { usuarioId: catalogo.usuarioId, texto: otro, textoNormalizado: otro },
  ] });
  await new AdminPage(page).iniciarSesion(catalogo.email, catalogo.password);
  await page.getByRole("link", { name: "Inventario Físico", exact: true }).click();
  await page.getByRole("link", { name: "A medida", exact: true }).click();
  const grupo = page.locator(".pedidos__item").filter({ has: page.getByRole("heading", { name: `«${texto}»`, exact: true }) });
  const otroGrupo = page.locator(".pedidos__item").filter({ has: page.getByRole("heading", { name: `«${otro}»`, exact: true }) });
  await expect(grupo).toBeVisible();
  await expect(grupo.locator(".pedidos__cuenta")).toHaveText("2 pedidos · 1 persona");
  await expect(otroGrupo).toBeVisible();
  await grupo.getByRole("button", { name: "Crear receta", exact: true }).click();
  const ui = new RecetasPage(page);
  const nombre = texto.charAt(0).toUpperCase() + texto.slice(1);
  await expect(page).toHaveURL(/\/admin\/recetas$/);
  await expect(ui.formulario.getByLabel("Nombre", { exact: true })).toHaveValue(nombre);
  await expect(ui.formulario.getByLabel("Palabras clave (separadas por coma)", { exact: true })).toHaveValue(texto);
  await ui.formulario.getByLabel("Precio por día (S/)", { exact: true }).fill("45");
  await ui.hueco(1, "Camisa del pedido", "CAMISA");
  const respuesta = await ui.guardar();
  expect(respuesta.status()).toBe(201);
  const creada: { id: string; peticionesVinculadas: number } = await respuesta.json();
  catalogo.recetasCreadas.push(creada.id);
  expect(creada.peticionesVinculadas).toBe(2);
  await expect(page.getByRole("status").filter({ hasText: "2 pedido(s) de clientes quedaron atendidos" })).toBeVisible();
  await expect(ui.tarjeta(nombre)).toBeVisible();
  expect(await catalogo.db.peticionDisfraz.count({ where: { usuarioId: catalogo.usuarioId, textoNormalizado: texto, recetaId: creada.id, atendida: true } })).toBe(2);
  expect(await catalogo.db.peticionDisfraz.findFirstOrThrow({ where: { usuarioId: catalogo.usuarioId, textoNormalizado: otro } })).toMatchObject({ recetaId: null, atendida: false });
  await page.goto("/admin/a-medida");
  await expect(otroGrupo).toBeVisible();
  await expect(grupo).toHaveCount(0);
  await page.reload();
  await expect(otroGrupo).toBeVisible();
  await expect(grupo).toHaveCount(0);
});

test("TC-E2E-REC-01: crear receta con piezas, rechazar todas opcionales y persistir la configuración", async ({ page, catalogo }) => {
  await new AdminPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const ui = new RecetasPage(page);
  await ui.abrir();
  const nombre = `${catalogo.prefijo} receta manual`;
  await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  await ui.formulario.getByLabel("Nombre", { exact: true }).fill(nombre);
  await ui.formulario.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(ui.formulario).toHaveCount(0);
  expect(await catalogo.db.receta.count({ where: { nombre } })).toBe(0);
  await page.getByRole("button", { name: "+ Nueva receta", exact: true }).click();
  await ui.formulario.getByLabel("Nombre", { exact: true }).fill(nombre);
  await ui.formulario.getByLabel("Precio por día (S/)", { exact: true }).fill("55");
  const clave = `clave${catalogo.prefijo.replaceAll("-", "")}`;
  await ui.formulario.getByLabel("Palabras clave (separadas por coma)", { exact: true }).fill(clave);
  await ui.formulario.getByLabel("Descripción (opcional)", { exact: true }).fill("Receta creada desde el panel RTM");
  await ui.hueco(1, "Camisa principal", "CAMISA");
  await ui.formulario.getByRole("textbox", { name: "Colores aceptados del hueco 1", exact: true }).fill("azul, blanco");
  await ui.formulario.getByRole("textbox", { name: "El nombre de la pieza contiene, hueco 1", exact: true }).fill(catalogo.prefijo);
  const obligatoria = ui.formulario.locator(".recetas__hueco").nth(0).getByRole("checkbox", { name: "Obligatorio", exact: true });
  await obligatoria.uncheck();
  const rechazada = await ui.guardar();
  expect(rechazada.status()).toBe(400);
  await expect(ui.formulario.getByRole("alert")).toContainText("Al menos un hueco debe ser obligatorio");
  expect(await catalogo.db.receta.count({ where: { nombre } })).toBe(0);
  await obligatoria.check();
  await ui.formulario.getByRole("button", { name: "+ Agregar hueco", exact: true }).click();
  await ui.hueco(2, "Pañuelo opcional", "PANUELO");
  await ui.formulario.locator(".recetas__hueco").nth(1).getByRole("checkbox", { name: "Obligatorio", exact: true }).uncheck();
  const respuesta = await ui.guardar();
  expect(respuesta.status()).toBe(201);
  const creada: { id: string } = await respuesta.json();
  catalogo.recetasCreadas.push(creada.id);
  const tarjeta = ui.tarjeta(nombre);
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta.locator(".recetas__precio")).toHaveText("S/ 55.00 por día");
  await expect(tarjeta.locator(".recetas__piezas > li")).toHaveCount(2);
  await expect(tarjeta.locator(".recetas__piezas")).toContainText("Camisa principal");
  await expect(tarjeta.locator(".recetas__piezas")).toContainText("Pañuelo opcional");
  await expect(tarjeta.getByRole("button", { name: "Desactivar", exact: true })).toBeVisible();
  await page.reload();
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta.locator(".recetas__precio")).toHaveText("S/ 55.00 por día");
  const guardada = await catalogo.db.receta.findUniqueOrThrow({ where: { id: creada.id }, include: { piezas: true } });
  expect(Number(guardada.precioDia)).toBe(55);
  expect(guardada.piezas).toHaveLength(2);
  expect(guardada).toMatchObject({
    nombre, activa: true, palabrasClave: [clave], descripcion: "Receta creada desde el panel RTM",
    piezas: expect.arrayContaining([
      expect.objectContaining({ etiqueta: "Camisa principal", tipo: "CAMISA", colores: ["azul", "blanco"], nombreContiene: catalogo.prefijo, obligatoria: true }),
      expect.objectContaining({ etiqueta: "Pañuelo opcional", tipo: "PANUELO", obligatoria: false }),
    ]),
  });
});
