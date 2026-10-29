import { expect, type Page } from "@playwright/test";

export class PerfilPage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }
  async abrir() {
    await this.page.getByTitle("Mi perfil", { exact: true }).click();
    await expect(this.page.getByRole("heading", { name: "Mis tallas", exact: true })).toBeVisible();
  }
  async guardarTallas(ropa: string, calzado: string) {
    await this.page.getByLabel("Talla de ropa", { exact: true }).selectOption(ropa);
    await this.page.getByLabel("Talla de calzado", { exact: true }).selectOption(calzado);
    const guardado = this.page.waitForResponse(res => res.url().endsWith("/api/auth/perfil/tallas") && res.request().method() === "PATCH");
    await this.page.getByRole("button", { name: "Guardar tallas", exact: true }).click();
    expect((await guardado).status()).toBe(200);
    await expect(this.page.getByRole("status").filter({ hasText: "Tallas guardadas." })).toBeVisible();
  }
}
