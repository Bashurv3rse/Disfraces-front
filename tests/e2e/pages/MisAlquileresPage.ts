import { expect, type Page } from "@playwright/test";

export class MisAlquileresPage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }

  tarjeta(evento: string) {
    return this.page.locator(".alquiler-card").filter({ has: this.page.getByRole("heading", { name: evento, exact: true }) });
  }

  async abrir() {
    await this.page.getByRole("link", { name: "Mis alquileres", exact: true }).click();
    await expect(this.page.getByRole("heading", { name: "Mis alquileres", exact: true })).toBeVisible();
    await expect(this.page.getByRole("status").filter({ hasText: "Cargando" })).toHaveCount(0);
  }
}
