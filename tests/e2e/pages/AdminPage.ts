import { expect, type Page } from "@playwright/test";

export class AdminPage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }

  async iniciarSesion(email: string, password: string) {
    await this.page.goto("/login");
    await this.page.getByLabel(/correo/i).fill(email);
    await this.page.getByLabel(/contraseña/i).fill(password);
    await this.page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(this.page).toHaveURL(/\/admin\/dashboard$/);
    await expect(this.page.getByRole("heading", { name: "Dashboard general", exact: true })).toBeVisible();
  }

  metrica(nombre: string) {
    return this.page.locator(".dash-metrica").filter({ has: this.page.getByText(nombre, { exact: true }) }).locator(".dash-metrica__valor");
  }

  proveedor(nombre: string) {
    return this.page.locator(".proveedores__item").filter({ has: this.page.getByRole("heading", { name: nombre, exact: true }) });
  }
}
