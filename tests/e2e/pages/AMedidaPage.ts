import { expect, type Page } from "@playwright/test";

export class AMedidaPage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }

  get texto() { return this.page.getByRole("textbox", { name: "¿Qué disfraz quieres?", exact: true }); }
  get resultado() { return this.page.getByRole("region", { name: "Resultado de la búsqueda", exact: true }); }

  armado(nombre: string) {
    return this.page.getByRole("region", { name: `Armar disfraz de ${nombre}`, exact: true });
  }

  receta(nombre: string) {
    return this.resultado.locator(".amedida__receta").filter({ has: this.page.getByRole("heading", { name: nombre, exact: true }) });
  }

  async abrir() {
    await this.page.getByRole("link", { name: "A medida", exact: true }).click();
    await expect(this.page.getByRole("heading", { name: "Disfraz a medida", exact: true })).toBeVisible();
  }

  async buscar(texto: string) {
    await this.texto.fill(texto);
    const consulta = this.page.waitForResponse(res => res.url().endsWith("/api/a-medida/buscar") && res.request().method() === "POST" && res.request().postDataJSON().texto === texto);
    await this.page.getByRole("button", { name: "Buscar", exact: true }).click();
    const respuesta = await consulta;
    expect(respuesta.status()).toBe(200);
    return respuesta;
  }
}
