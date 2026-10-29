import { test, expect } from "./fixtures/catalogo";
import { CatalogoPage } from "./pages/CatalogoPage";
import { AMedidaPage } from "./pages/AMedidaPage";

interface Busqueda {
  peticionId: string;
  resultado: "EXACTA" | "PARECIDA" | "SIN_RECETA";
  recetas: Array<{ id: string; nombre: string; precioDia: number; piezas: Array<{ etiqueta: string; tipo: string; obligatoria: boolean }> }>;
}

test("TC-E2E-BUS-01: buscar marinera muestra la receta y sus piezas y registra búsquedas sin coincidencia", async ({ page, catalogo }) => {
  // Nombre ordenable al inicio: no depende del orden de inserción ni elimina recetas existentes.
  const receta = await catalogo.db.receta.create({ data: {
    nombre: `000 ${catalogo.prefijo} Marinera`, descripcion: "Marinera de prueba con tres piezas", precioDia: 45,
    palabrasClave: ["marinera", catalogo.prefijo],
    piezas: { create: [
      { etiqueta: "Blusa marinera", tipo: "CAMISA", colores: ["blanco"], obligatoria: true },
      { etiqueta: "Falda marinera", tipo: "FALDA", colores: ["azul"], obligatoria: true },
      { etiqueta: "Pañuelo marinero", tipo: "PANUELO", obligatoria: false },
    ] },
  } });
  catalogo.recetasCreadas.push(receta.id);
  const inactiva = await catalogo.db.receta.create({ data: {
    nombre: `000 ${catalogo.prefijo} Marinera inactiva`, precioDia: 99, palabrasClave: ["marinera"], activa: false,
  } });
  catalogo.recetasCreadas.push(inactiva.id);
  await new CatalogoPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const ui = new AMedidaPage(page);
  await ui.abrir();
  await expect(page.getByRole("button", { name: "Buscar", exact: true })).toBeDisabled();
  await ui.texto.fill("m");
  await expect(page.getByRole("button", { name: "Buscar", exact: true })).toBeDisabled();
  expect(await catalogo.db.peticionDisfraz.count({ where: { usuarioId: catalogo.usuarioId } })).toBe(0);

  const respuesta = await ui.buscar("marinera");
  const encontrada: Busqueda = await respuesta.json();
  expect(encontrada.resultado).toBe("EXACTA");
  expect(encontrada.recetas).toEqual(expect.arrayContaining([expect.objectContaining({ id: receta.id, nombre: receta.nombre, precioDia: 45 })]));
  expect(encontrada.recetas.map(r => r.id)).not.toContain(inactiva.id);
  expect(encontrada.recetas.find(r => r.id === receta.id)!.piezas).toEqual(expect.arrayContaining([
    expect.objectContaining({ etiqueta: "Blusa marinera", tipo: "CAMISA", obligatoria: true }),
    expect.objectContaining({ etiqueta: "Falda marinera", tipo: "FALDA", obligatoria: true }),
    expect.objectContaining({ etiqueta: "Pañuelo marinero", tipo: "PANUELO", obligatoria: false }),
  ]));
  const tarjeta = ui.receta(receta.nombre);
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta).toContainText("Marinera de prueba con tres piezas");
  await expect(tarjeta.locator(".amedida__precio")).toHaveText("S/ 45.00 / día");
  await expect(tarjeta.locator(".amedida__chip-pieza")).toHaveCount(3);
  for (const pieza of ["Blusa marinera", "Falda marinera", "Pañuelo marinero"]) await expect(tarjeta.locator(".amedida__chip-pieza").filter({ hasText: pieza })).toBeVisible();
  await expect(tarjeta.locator(".amedida__chip-pieza--opcional")).toContainText("Pañuelo marinero");
  await expect(tarjeta.getByRole("button", { name: /Armar este disfraz|Armando este disfraz/ })).toBeEnabled();
  await expect(ui.receta(inactiva.nombre)).toHaveCount(0);
  expect(await catalogo.db.peticionDisfraz.findUniqueOrThrow({ where: { id: encontrada.peticionId } })).toMatchObject({ usuarioId: catalogo.usuarioId, texto: "marinera", textoNormalizado: "marinera", atendida: false });

  const desconocido = `astronautainexistente${crypto.randomUUID().replaceAll("-", "")}`;
  const sinCoincidencia: Busqueda = await (await ui.buscar(desconocido)).json();
  expect(sinCoincidencia.resultado).toBe("SIN_RECETA");
  await expect(ui.resultado.getByRole("status")).toContainText("Ya registramos tu pedido");
  expect(await catalogo.db.peticionDisfraz.findUniqueOrThrow({ where: { id: sinCoincidencia.peticionId } })).toMatchObject({ usuarioId: catalogo.usuarioId, texto: desconocido, recetaId: null, atendida: false });
  // Repetir dentro de diez minutos recupera la petición, sin duplicar el pedido.
  const repetida: Busqueda = await (await ui.buscar("marinera")).json();
  expect(repetida.peticionId).toBe(encontrada.peticionId);
  await expect(tarjeta).toBeVisible();
  expect(await catalogo.db.peticionDisfraz.count({ where: { usuarioId: catalogo.usuarioId } })).toBe(2);
  expect(await catalogo.db.reserva.count({ where: { usuarioId: catalogo.usuarioId } })).toBe(0);
});
