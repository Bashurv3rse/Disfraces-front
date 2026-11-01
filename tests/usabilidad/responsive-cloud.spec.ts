
import { test, expect } from "@playwright/test";

const dispositivos = [
  { nombre: "Móvil", ancho: 375, alto: 812 },
  { nombre: "Tableta", ancho: 768, alto: 1024 },
  { nombre: "Escritorio", ancho: 1366, alto: 768 },
];

const pantallas = [
  { nombre: "Login", ruta: "/login" },
  { nombre: "Registro", ruta: "/registro" },
  { nombre: "Catálogo", ruta: "/catalogo" },
];

for (const dispositivo of dispositivos) {
  for (const pantalla of pantallas) {
    test(`PU-CLOUD-RESP: ${pantalla.nombre} en ${dispositivo.nombre}`, async ({ page }) => {
      await page.setViewportSize({
        width: dispositivo.ancho,
        height: dispositivo.alto,
      });

      await page.goto(pantalla.ruta);

      await expect(page.locator("body")).toBeVisible();

      // Esperar a que el documento termine de cargar.
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      const dimensiones = await page.evaluate(() => ({
        contenido: document.documentElement.scrollWidth,
        ventana: document.documentElement.clientWidth,
      }));

      expect(
        dimensiones.contenido,
        `Desbordamiento horizontal en ${pantalla.nombre} - ${dispositivo.nombre}`
      ).toBeLessThanOrEqual(dimensiones.ventana + 1);

      if (pantalla.ruta === "/login") {
        await expect(
          page.getByRole("button", { name: "Ingresar" })
        ).toBeVisible();
      }

      if (pantalla.ruta === "/registro") {
        await expect(
          page.getByRole("button", { name: "Crear cuenta" })
        ).toBeVisible();
      }

      if (pantalla.ruta === "/catalogo") {
        await expect(
          page.getByRole("textbox", { name: "Buscar", exact: true })
        ).toBeVisible();
      }
    });
  }
}
