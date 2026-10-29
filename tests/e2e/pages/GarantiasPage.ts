import { expect, type Page } from "@playwright/test";

export class GarantiasPage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }
  tarjeta(disfraz: string) {
    return this.page.locator(".dev-card").filter({ has: this.page.getByText(disfraz, { exact: true }) });
  }
  async abrir() {
    await this.page.getByRole("link", { name: "Devoluciones", exact: true }).click();
    await expect(this.page.getByRole("heading", { name: "Devoluciones y garantías", exact: true })).toBeVisible();
  }
}
