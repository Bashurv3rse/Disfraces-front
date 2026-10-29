import { expect, test } from "@playwright/test";

const API = "http://localhost:3000/api";
const password = "PruebaRtm#2026";

test("TC-E2E-AUTH-01: registrarse desde la interfaz autentica inmediatamente al cliente", async ({ page }) => {
  const email = `rtm-ui-${crypto.randomUUID()}@test.local`;
  await page.goto("/registro");
  await page.getByLabel("Nombre", { exact: true }).fill("Cliente RTM UI");
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/teléfono/i).fill("987654321");
  await page.getByLabel(/dirección/i).fill("Dirección RTM 123");
  await page.getByLabel(/contraseña/i).fill(password);
  const registro = page.waitForResponse(response => response.url().endsWith("/api/auth/registro") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  const respuesta = await registro;
  expect(respuesta.status()).toBe(201);
  expect((await respuesta.json()).usuario).toMatchObject({ email, rol: "CLIENTE" });
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole("button", { name: /cerrar sesión/i })).toBeVisible();
  // Tras recargar, React debe recuperar la sesión de la cookie real.
  await page.reload();
  await expect(page.getByRole("button", { name: /cerrar sesión/i })).toBeVisible();
  await page.goto("/perfil");
  await expect(page.getByLabel(/correo/i)).toHaveValue(email);
});

test("TC-E2E-AUTH-03: cerrar sesión invalida la sesión abierta en otro navegador", async ({ browser, page, request }) => {
  const email = `rtm-sesiones-${crypto.randomUUID()}@test.local`;
  const registro = await request.post(`${API}/auth/registro`, {
    data: { nombre: "Cliente dos sesiones", email, password, telefono: "987654321", direccion: "Dirección RTM 123" },
  });
  expect(registro.status()).toBe(201);
  const otroContexto = await browser.newContext();
  try {
    const otraPagina = await otroContexto.newPage();
    for (const navegador of [page, otraPagina]) {
      await navegador.goto("http://localhost:5173/login");
      await navegador.getByLabel(/correo/i).fill(email);
      await navegador.getByLabel(/contraseña/i).fill(password);
      await navegador.getByRole("button", { name: "Ingresar", exact: true }).click();
      await expect(navegador).toHaveURL(/\/catalogo$/);
      await expect(navegador.getByRole("button", { name: /cerrar sesión/i })).toBeVisible();
    }
    const logout = page.waitForResponse(response => response.url().endsWith("/api/auth/logout"));
    await page.getByRole("button", { name: /cerrar sesión/i }).click();
    expect((await logout).status()).toBe(200);
    const refresh = otraPagina.waitForResponse(response => response.url().endsWith("/api/auth/refrescar"));
    await otraPagina.reload();
    expect((await refresh).status()).toBe(401);
    await expect(otraPagina.getByRole("button", { name: /cerrar sesión/i })).toHaveCount(0);
    await otraPagina.goto("http://localhost:5173/perfil");
    await expect(otraPagina).toHaveURL(/\/login$/);
  } finally {
    await otroContexto.close();
  }
});
