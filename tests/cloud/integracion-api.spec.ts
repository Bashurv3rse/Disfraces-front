
import { test, expect } from "@playwright/test";

test("TC-CLOUD-INT-01: catálogo consulta correctamente la API desplegada", async ({ page }) => {
  const urlAPI = "https://disfraces-api.duckdns.org/api/disfraces";

  // Evitar reutilizar respuestas almacenadas en caché.
  await page.context().setExtraHTTPHeaders({
    "Cache-Control": "no-cache",
  });

  // Esperar la solicitud real que realiza el frontend.
  const respuestaAPI = page.waitForResponse(
    response =>
      response.url().split("?")[0] === urlAPI &&
      response.request().method() === "GET"
  );

  // Abrir el catálogo publicado en Azure.
  await page.goto("/catalogo");

  // Obtener la respuesta del backend.
  const respuesta = await respuestaAPI;

  // Verificar que la API responde correctamente.
  expect(respuesta.status()).toBe(200);

  // Verificar que devuelve información JSON.
  const datos = await respuesta.json();
  expect(datos).toBeDefined();

  // Confirmar que seguimos en el catálogo.
  await expect(page).toHaveURL(/\/catalogo\/?$/);

  // Verificar que el buscador está disponible.
  await expect(
    page.getByRole("textbox", {
      name: "Buscar",
      exact: true,
    })
  ).toBeVisible();
});
