
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pantallas = [
  { nombre: "Login", ruta: "/login" },
  { nombre: "Registro", ruta: "/registro" },
  { nombre: "Catálogo", ruta: "/catalogo" },
];

for (const pantalla of pantallas) {
  test(`PU-CLOUD-CONTRASTE: ${pantalla.nombre}`, async ({ page }) => {
    await page.goto(pantalla.ruta);

    await expect(page.locator("body")).toBeVisible();

    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const resultados = await new AxeBuilder({ page })
      .withTags(["wcag2aa"])
      .withRules(["color-contrast"])
      .analyze();

    const violaciones = resultados.violations.filter(
      (violacion) => violacion.id === "color-contrast"
    );

    expect(
      violaciones,
      JSON.stringify(violaciones, null, 2)
    ).toEqual([]);
  });
}
