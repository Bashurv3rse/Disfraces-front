import { expect, type Page } from "@playwright/test";

export class CrearDisfrazPage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }
  get formulario() { return this.page.locator(".crear__form"); }
  async abrir() {
    await this.page.getByRole("link", { name: "Inventario Físico", exact: true }).click();
    await this.page.getByRole("link", { name: "+ Nuevo disfraz", exact: true }).click();
    await expect(this.formulario).toBeVisible();
  }
  async prenda(numero: number, nombre: string, tipo: string, talla: string) {
    await this.formulario.getByLabel(`Nombre de la prenda ${numero}`, { exact: true }).fill(nombre);
    await this.formulario.getByLabel(`Tipo de la prenda ${numero}`, { exact: true }).selectOption(tipo);
    await this.formulario.getByLabel(`Color de la prenda ${numero}`, { exact: true }).fill("azul");
    await this.formulario.getByLabel(`Talla de la prenda ${numero}`, { exact: true }).fill(talla);
  }
}
