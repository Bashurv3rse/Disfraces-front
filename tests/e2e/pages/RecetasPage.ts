import { expect, type Page } from "@playwright/test";

export class RecetasPage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }
  get formulario() { return this.page.locator(".recetas__form"); }
  tarjeta(nombre: string) {
    return this.page.locator(".recetas__item").filter({ has: this.page.getByRole("heading", { name: nombre, exact: true }) });
  }
  async abrir() {
    await this.page.getByRole("link", { name: "Inventario Físico", exact: true }).click();
    await this.page.getByRole("link", { name: "Recetas", exact: true }).click();
    await expect(this.page.getByRole("heading", { name: "Recetas de disfraces a medida", exact: true })).toBeVisible();
  }
  async hueco(numero: number, etiqueta: string, tipo: string) {
    await this.formulario.getByRole("textbox", { name: `Nombre del hueco ${numero}`, exact: true }).fill(etiqueta);
    await this.formulario.getByRole("combobox", { name: `Tipo de prenda del hueco ${numero}`, exact: true }).selectOption(tipo);
  }
  async guardar() {
    const consulta = this.page.waitForResponse(res => res.url().endsWith("/api/recetas") && res.request().method() === "POST");
    await this.formulario.getByRole("button", { name: "Crear receta", exact: true }).click();
    return consulta;
  }
}
