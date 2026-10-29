import { expect, type Page } from "@playwright/test";

export class InventarioPage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }

  get detalle() { return this.page.locator(".inventario__detalle"); }

  fila(nombre: string) {
    const literal = nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.page.locator(".inventario__disfraz-btn").filter({
      has: this.page.locator(".inventario__disfraz-nombre").filter({ hasText: new RegExp(`^\\s*${literal}\\s*⚠?\\s*$`) }),
    });
  }

  async abrir(prefijo: string) {
    await this.page.getByRole("link", { name: "Inventario Físico", exact: true }).click();
    await expect(this.page.getByRole("heading", { name: "Inventario Físico", exact: true })).toBeVisible();
    await this.page.getByRole("textbox", { name: "Buscar disfraz", exact: true }).fill(prefijo);
  }

  async seleccionar(nombre: string) {
    await this.fila(nombre).click();
    await expect(this.detalle.getByRole("heading", { name: nombre, exact: true })).toBeVisible();
  }

  estado(nombre: string) { return this.fila(nombre).locator(".inventario__estado-badge"); }

  candidato(origen: string) {
    return this.page.getByRole("dialog").locator(".inventario-candidato").filter({
      has: this.page.locator(".inventario-candidato__meta").filter({ hasText: `de ${origen}` }),
    });
  }
}
