import { test, expect } from "./fixtures/catalogo";
import { AdminPage } from "./pages/AdminPage";

test.use({ catalogoRol: "ADMINISTRADOR" });

interface Resumen {
  totalAlquileres: number;
  alquileresActivos: number;
  alquileresProximos: number;
  ingresosMes: number;
  devolucionesPendientes: number;
}

test("TC-E2E-DASH-01: el dashboard refleja métricas reales y se actualiza al cambiar los datos", async ({ page, catalogo }) => {
  const ui = new AdminPage(page);
  const primeraConsulta = page.waitForResponse(res => res.url().endsWith("/api/alquileres/admin/resumen"));
  await ui.iniciarSesion(catalogo.email, catalogo.password);
  const respuesta = await primeraConsulta;
  expect(respuesta.status()).toBe(200);
  const inicial: Resumen = await respuesta.json();
  await expect(ui.metrica("Total alquileres")).toHaveText(String(inicial.totalAlquileres));
  await expect(ui.metrica("Alquileres activos")).toHaveText(String(inicial.alquileresActivos));
  await expect(ui.metrica("Ingresos del mes")).toHaveText(`S/ ${inicial.ingresosMes.toFixed(2)}`);
  await expect(ui.metrica("Garantías por resolver")).toHaveText(String(inicial.devolucionesPendientes));

  // Sin borrar los datos existentes: los cambios esperados se calculan sobre la línea base.
  const ahora = new Date();
  const hoy = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
  const dia = 86_400_000;
  const disfraz = await catalogo.crear("alquilado dashboard");
  await catalogo.db.alquiler.create({ data: {
    usuarioId: catalogo.usuarioId, fechaInicio: new Date(+hoy - dia), fechaFin: new Date(+hoy + dia),
    estado: "ACTIVO", montoTotal: 120, montoGarantia: 30,
    disfraces: { create: { disfrazFisicoId: disfraz.id, precioUnitario: 40 } },
  } });
  await catalogo.db.alquiler.create({ data: {
    usuarioId: catalogo.usuarioId, fechaInicio: new Date(+hoy + 3 * dia), fechaFin: new Date(+hoy + 4 * dia),
    estado: "ACTIVO", montoTotal: 40, montoGarantia: 10,
  } });
  await catalogo.db.alquiler.create({ data: {
    usuarioId: catalogo.usuarioId, fechaInicio: new Date(+hoy - 3 * dia), fechaFin: new Date(+hoy - 2 * dia),
    estado: "FINALIZADO", montoTotal: 80, montoGarantia: 20,
  } });
  const incompleto = await catalogo.crear("incompleto dashboard");
  await catalogo.db.prenda.updateMany({ where: { disfrazHogarId: incompleto.id }, data: { estado: "DANADA" } });

  const nuevaConsulta = page.waitForResponse(res => res.url().endsWith("/api/alquileres/admin/resumen"));
  await page.reload();
  const nuevaRespuesta = await nuevaConsulta;
  expect(nuevaRespuesta.status()).toBe(200);
  const esperado = {
    totalAlquileres: inicial.totalAlquileres + 3,
    alquileresActivos: inicial.alquileresActivos + 1,
    alquileresProximos: inicial.alquileresProximos + 1,
    ingresosMes: inicial.ingresosMes + 240,
    devolucionesPendientes: inicial.devolucionesPendientes,
  };
  expect(await nuevaRespuesta.json()).toMatchObject(esperado);
  await expect(ui.metrica("Total alquileres")).toHaveText(String(esperado.totalAlquileres));
  await expect(ui.metrica("Alquileres activos")).toHaveText(String(esperado.alquileresActivos));
  await expect(page.locator(".dash-metrica__nota").filter({ hasText: `${esperado.alquileresProximos} próximos` })).toBeVisible();
  await expect(ui.metrica("Ingresos del mes")).toHaveText(`S/ ${esperado.ingresosMes.toFixed(2)}`);
  await expect(ui.metrica("Garantías por resolver")).toHaveText(String(esperado.devolucionesPendientes));
  await expect(page.locator(".dash-ultimos__nombre").getByText(catalogo.prefijo, { exact: true })).toHaveCount(3);
  await expect(page.locator(".dash-leyenda")).toContainText(`${catalogo.prefijo}-tipo`);
  await expect(page.locator(".dash-incompletos").getByText(incompleto.nombre, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Garantías por resolver/ }).click();
  await expect(page).toHaveURL(/\/admin\/devoluciones$/);
});

test("TC-E2E-PROV-01: registrar proveedor y asociar una prenda desde la interfaz con persistencia", async ({ page, catalogo }) => {
  const ui = new AdminPage(page);
  const disfraz = await catalogo.crear("proveedor");
  const prenda = await catalogo.db.prenda.findFirstOrThrow({ where: { disfrazHogarId: disfraz.id } });
  await ui.iniciarSesion(catalogo.email, catalogo.password);
  await page.getByRole("link", { name: "Proveedores", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Proveedores", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+ Nuevo proveedor", exact: true }).click();
  // Camino alterno: nombre de un carácter rechazado por la validación real del servidor.
  await page.getByLabel("Nombre", { exact: true }).fill("A");
  await page.getByLabel("Persona de contacto", { exact: true }).fill("Contacto RTM");
  const rechazo = page.waitForResponse(res => res.url().endsWith("/api/proveedores") && res.request().method() === "POST");
  await page.getByRole("button", { name: "Registrar proveedor", exact: true }).click();
  expect((await rechazo).status()).toBe(400);
  await expect(page.getByRole("alert")).toContainText("No se pudo registrar el proveedor");
  const nombre = `${catalogo.prefijo} proveedor`;
  await page.getByLabel("Nombre", { exact: true }).fill(nombre);
  await page.getByLabel("Teléfono (opcional)", { exact: true }).fill("987654321");
  await page.getByLabel("Email (opcional)", { exact: true }).fill(`proveedor-${catalogo.email}`);
  const registro = page.waitForResponse(res => res.url().endsWith("/api/proveedores") && res.request().method() === "POST");
  await page.getByRole("button", { name: "Registrar proveedor", exact: true }).click();
  const respuesta = await registro;
  expect(respuesta.status()).toBe(201);
  const proveedor: { id: string } = await respuesta.json();
  const tarjeta = ui.proveedor(nombre);
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta).toContainText("Contacto RTM");
  await tarjeta.getByRole("button", { name: /0 prenda\(s\) asociada\(s\)/ }).click();
  await expect(tarjeta.getByRole("button", { name: "Asociar", exact: true })).toBeDisabled();
  await tarjeta.getByRole("combobox", { name: `Asociar prenda a ${nombre}`, exact: true }).selectOption(prenda.id);
  const asociacion = page.waitForResponse(res => res.url().endsWith(`/api/proveedores/${proveedor.id}/piezas`) && res.request().method() === "POST");
  await tarjeta.getByRole("button", { name: "Asociar", exact: true }).click();
  expect((await asociacion).status()).toBe(201);
  await expect(tarjeta.getByRole("button", { name: /1 prenda\(s\) asociada\(s\)/ })).toBeVisible();
  await expect(tarjeta.locator(".proveedores__pieza-nombre")).toHaveText(prenda.nombre);
  await expect(tarjeta.locator(`option[value="${prenda.id}"]`)).toHaveCount(0);
  await expect(tarjeta.getByRole("button", { name: "Asociar", exact: true })).toBeDisabled();
  await page.reload();
  await tarjeta.getByRole("button", { name: /1 prenda\(s\) asociada\(s\)/ }).click();
  await expect(tarjeta.locator(".proveedores__pieza-nombre")).toHaveText(prenda.nombre);
  expect(await catalogo.db.prendaProveedor.count({ where: { proveedorId: proveedor.id, prendaId: prenda.id } })).toBe(1);
  expect(await catalogo.db.proveedor.findUniqueOrThrow({ where: { id: proveedor.id } })).toMatchObject({
    nombre, contacto: "Contacto RTM", telefono: "987654321", email: `proveedor-${catalogo.email}`,
  });
});
