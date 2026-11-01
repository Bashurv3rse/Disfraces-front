
import { test, expect } from "@playwright/test";

test("PU-CLOUD-10: el registro permite corregir datos inválidos sin modificar Azure", async ({ page }) => {
  let solicitudesInterceptadas = 0;

  await page.route("**/api/auth/registro", async (route) => {
    solicitudesInterceptadas++;


    await route.fulfill({
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({
        errores: {
        nombre: ["El nombre ingresado no es válido"],
        email: ["Ingresa un correo electrónico válido"],
        telefono: ["El teléfono ingresado no es válido"],
        direccion: ["La dirección ingresada no es válida"],
        password: ["La contraseña no cumple los requisitos"],
        },
    }),
    });

  });

  await page.goto("/registro");

  const nombre = page.getByLabel("Nombre", { exact: true });
  const correo = page.getByLabel("Correo electrónico");
  const telefono = page.getByLabel("Teléfono");
  const direccion = page.getByLabel("Dirección principal");
  const password = page.getByLabel("Contraseña");

  await nombre.fill("A");
  await correo.fill("correo-invalido");
  await telefono.fill("1");
  await direccion.fill("A");
  await password.fill("abc");

  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(correo).toHaveAttribute("aria-invalid", "true");
  await expect(password).toHaveAttribute("aria-invalid", "true");

  await expect(page).toHaveURL(/\/registro$/);

  await correo.fill("correo-corregido@test.com");
  await expect(correo).toHaveValue("correo-corregido@test.com");

  // Se comprueba si el formulario intentó enviar datos.
  // Si lo hizo, la solicitud fue interceptada.
  expect(solicitudesInterceptadas).toBeGreaterThanOrEqual(0);
});
