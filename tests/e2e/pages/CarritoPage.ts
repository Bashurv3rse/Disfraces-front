import { expect, type Page } from "@playwright/test";

export class CarritoPage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }
  get dialogo() { return this.page.getByRole("dialog", { name: "Tu carrito", exact: true }); }

  async fechas(inicio: string, fin: string) {
    await this.dialogo.getByLabel("Fecha inicio", { exact: true }).fill(inicio);
    const consulta = this.page.waitForResponse(res => res.url().endsWith("/api/pagos/cotizar") && res.request().method() === "POST" && res.request().postDataJSON().fechaFin === fin);
    await this.dialogo.getByLabel("Fecha fin", { exact: true }).fill(fin);
    const respuesta = await consulta;
    expect(respuesta.status()).toBe(200);
    return respuesta;
  }

  linea(etiqueta: string) {
    return this.dialogo.locator(".carrito-drawer__resumen-linea").filter({ has: this.page.getByText(etiqueta, { exact: true }) });
  }
}
