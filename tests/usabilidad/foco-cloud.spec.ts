
import { test, expect } from "@playwright/test";

test("PU-CLOUD-11: el login presenta un indicador de foco visible", async ({ page }) => {
  await page.goto("/login");

  const correo = page.getByLabel(/correo/i);
  const password = page.getByLabel(/contraseña/i);
  const ingresar = page.getByRole("button", {
    name: "Ingresar",
  });

  const controles = [correo, password, ingresar];

  for (const control of controles) {
    await control.focus();
    await expect(control).toBeFocused();

    const estilos = await control.evaluate((elemento) => {
      const css = window.getComputedStyle(elemento);

      return {
        outlineStyle: css.outlineStyle,
        outlineWidth: css.outlineWidth,
        outlineColor: css.outlineColor,
        boxShadow: css.boxShadow,
      };
    });

    const tieneOutline =
      estilos.outlineStyle !== "none" &&
      parseFloat(estilos.outlineWidth) > 0;

    const tieneSombra =
      estilos.boxShadow !== "none";

    expect(
      tieneOutline || tieneSombra,
      `El control no presenta outline ni box-shadow de foco: ${JSON.stringify(estilos)}`
    ).toBe(true);
  }
});
