
import { test, expect } from "@playwright/test";

test("TC-CLOUD-SEC-01: visitante no puede acceder al panel administrativo", async ({ page }) => {
  // Acceder directamente a una ruta protegida en Azure.
  await page.goto("/admin/dashboard");

  // El sistema debe redirigir al visitante al login.
  await expect(page).toHaveURL(/\/login\/?$/);

  // El formulario de inicio de sesión debe estar visible.
  await expect(
    page.getByRole("button", { name: "Ingresar", exact: true })
  ).toBeVisible();

  // El contenido administrativo no debe mostrarse.
  await expect(
    page.getByRole("heading", {
      name: "Dashboard general",
      exact: true,
    })
  ).toHaveCount(0);
  
});


test("TC-CLOUD-SEC-02: visitante no puede acceder a rutas administrativas", async ({ page }) => {
  const rutasAdministrativas = [
    "/admin/dashboard",
    "/admin/devoluciones",
    "/admin/proveedores",
    "/admin/inventario",
    "/admin/usuarios",
    "/admin/disfraces/nuevo",
    "/admin/almacen",
    "/admin/recetas",
    "/admin/a-medida",
  ];

  for (const ruta of rutasAdministrativas) {
    await test.step(`Verificar acceso a ${ruta}`, async () => {
      // Visitar directamente la ruta administrativa.
      await page.goto(ruta);

      // Un visitante sin sesión debe ser redirigido al login.
      await expect(page).toHaveURL(/\/login\/?$/);

      // No debe mostrarse el contenido administrativo.
      await expect(
        page.getByRole("heading", {
          name: "Dashboard general",
          exact: true,
        })
      ).toHaveCount(0);
    });
  }
});


test("TC-CLOUD-FUN-01: visitante puede visualizar el catálogo público", async ({ page }) => {
  // Abrir el catálogo desplegado en Azure.
  const respuesta = await page.goto("/catalogo");

  // La página debe responder correctamente.
  expect(respuesta).not.toBeNull();
  expect(respuesta!.status()).toBe(200);

  // El visitante debe permanecer en el catálogo.
  await expect(page).toHaveURL(/\/catalogo\/?$/);

  // El buscador debe estar disponible.
  await expect(
    page.getByRole("textbox", {
      name: "Buscar",
      exact: true,
    })
  ).toBeVisible();

  // La página no debe redirigir al login.
  await expect(page).not.toHaveURL(/\/login\/?$/);
});

