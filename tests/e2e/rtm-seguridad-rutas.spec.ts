import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/catalogo";
import { CatalogoPage } from "./pages/CatalogoPage";

async function comprobarAlmacenamiento(page: Page, accessToken: string, refreshToken: string) {
  const resultado = await page.evaluate(({ accessToken, refreshToken }) => {
    const entradas = [localStorage, sessionStorage].flatMap(storage =>
      Array.from({ length: storage.length }, (_, i) => {
        const clave = storage.key(i)!;
        return `${clave}:${storage.getItem(clave)}`;
      })
    );
    return {
      tokenPersistido: entradas.some(v => v.includes(accessToken) || v.includes(refreshToken) || /eyJ[\w-]+\.[\w-]+\.[\w-]+/.test(v)),
      cookieLegible: document.cookie.includes("refreshToken") || document.cookie.includes(accessToken) || document.cookie.includes(refreshToken),
      usuario: JSON.parse(localStorage.getItem("usuario") ?? "null"),
    };
  }, { accessToken, refreshToken });
  expect(resultado.tokenPersistido, "No debe persistir ningún JWT en Web Storage").toBe(false);
  expect(resultado.cookieLegible, "La cookie de renovación no debe ser legible mediante document.cookie").toBe(false);
  return resultado.usuario;
}

test("TC-FE-SEC-01: tokens fuera de Web Storage y renovación mediante cookie HttpOnly", async ({ page, catalogo }) => {
  const login = page.waitForResponse(res => res.url().endsWith("/api/auth/login") && res.request().method() === "POST");
  await new CatalogoPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const respuesta = await login;
  expect(respuesta.status()).toBe(200);
  const datos: { accessToken: string } = await respuesta.json();
  expect(typeof datos.accessToken).toBe("string");
  expect(datos.accessToken.length > 20).toBe(true);
  const cookie = (await page.context().cookies("http://localhost:3000")).find(c => c.name === "refreshToken");
  expect(cookie, "El login real debe establecer refreshToken").toBeDefined();
  expect(cookie!.httpOnly).toBe(true);
  expect(cookie!.value.length > 20).toBe(true);
  const usuario = await comprobarAlmacenamiento(page, datos.accessToken, cookie!.value);
  expect(usuario).toEqual({ id: catalogo.usuarioId, nombre: catalogo.prefijo, email: catalogo.email, rol: "CLIENTE" });
  const perfil = page.waitForResponse(res => res.url().endsWith("/api/auth/perfil") && res.request().method() === "GET");
  await page.getByTitle("Mi perfil", { exact: true }).click();
  const respuestaPerfil = await perfil;
  expect(respuestaPerfil.status()).toBe(200);
  expect(respuestaPerfil.request().headers().authorization === `Bearer ${datos.accessToken}`).toBe(true);
  await expect(page.getByLabel(/correo/i)).toHaveValue(catalogo.email);
  // Una recarga elimina la memoria JS: la sesión se recupera con la cookie HttpOnly real.
  const renovacion = page.waitForResponse(res => res.url().endsWith("/api/auth/refrescar") && res.request().method() === "POST");
  await page.reload();
  const respuestaRenovacion = await renovacion;
  expect(respuestaRenovacion.status()).toBe(200);
  const renovados: { accessToken: string } = await respuestaRenovacion.json();
  expect(typeof renovados.accessToken).toBe("string");
  expect(renovados.accessToken.length > 20).toBe(true);
  await expect(page.getByLabel(/correo/i)).toHaveValue(catalogo.email);
  await comprobarAlmacenamiento(page, renovados.accessToken, cookie!.value);
  // Camino alterno: sin la cookie, una recarga no puede recuperar la sesión desde localStorage.
  await page.context().clearCookies();
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem("usuario"))).toBeNull();
  await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toHaveCount(0);
});

test("TC-E2E-RBAC-01: cliente y visitante no pueden abrir rutas administrativas ni elevarse con localStorage", async ({ page, browser, request, catalogo }) => {
  const login = page.waitForResponse(res => res.url().endsWith("/api/auth/login") && res.request().method() === "POST");
  await new CatalogoPage(page).iniciarSesion(catalogo.email, catalogo.password);
  const { accessToken }: { accessToken: string } = await (await login).json();
  const consultasAdministrativas: string[] = [];
  const apiAdmin = ["/api/alquileres/admin/resumen", "/api/proveedores", "/api/devoluciones", "/api/auth/usuarios"];
  page.on("request", req => {
    if (apiAdmin.includes(new URL(req.url()).pathname)) consultasAdministrativas.push(new URL(req.url()).pathname);
  });
  const rutas = ["/admin/dashboard", "/admin/devoluciones", "/admin/proveedores", "/admin/inventario", "/admin/usuarios", "/admin/disfraces/nuevo", "/admin/almacen", "/admin/recetas", "/admin/a-medida"];
  for (const ruta of rutas) {
    await test.step(ruta, async () => {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/catalogo$/);
      await expect(page.getByRole("textbox", { name: "Buscar", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
    });
  }
  // Los datos básicos de UI no otorgan permisos: al recargar se consulta el rol real.
  await page.evaluate(() => {
    const usuario = JSON.parse(localStorage.getItem("usuario")!);
    localStorage.setItem("usuario", JSON.stringify({ ...usuario, rol: "ADMINISTRADOR" }));
  });
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/catalogo$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("usuario")!).rol)).toBe("CLIENTE");
  expect(consultasAdministrativas).toEqual([]);
  // El servidor también rechaza el acceso directo con el token auténtico del cliente.
  const denegada = await request.get("http://localhost:3000/api/alquileres/admin/resumen", { headers: { Authorization: `Bearer ${accessToken}` } });
  expect(denegada.status()).toBe(403);
  expect(await denegada.json()).toMatchObject({ mensaje: "No tienes permisos para esta acción" });
  await page.getByTitle("Mi perfil", { exact: true }).click();
  await expect(page.getByLabel(/correo/i)).toHaveValue(catalogo.email);
  const anonimo = await browser.newContext();
  try {
    const visitante = await anonimo.newPage();
    await visitante.goto("http://localhost:5173/admin/dashboard");
    await expect(visitante).toHaveURL(/\/login$/);
    await expect(visitante.getByRole("button", { name: "Ingresar", exact: true })).toBeVisible();
    await expect(visitante.getByRole("heading", { name: "Dashboard general", exact: true })).toHaveCount(0);
  } finally {
    await anonimo.close();
  }
});
