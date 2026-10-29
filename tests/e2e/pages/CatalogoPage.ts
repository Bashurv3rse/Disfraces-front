import { expect, type Page } from "@playwright/test";

export class CatalogoPage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }

  tarjeta(nombre: string) {
    return this.page.getByRole("listitem").filter({ has: this.page.getByRole("heading", { name: nombre, exact: true }) });
  }

  async buscar(texto: string) {
    const consulta = this.page.waitForResponse(res => {
      const url = new URL(res.url());
      return url.pathname === "/api/disfraces" && url.searchParams.get("nombre") === texto;
    });
    await this.page.getByRole("textbox", { name: "Buscar", exact: true }).fill(texto);
    expect((await consulta).status()).toBe(200);
    await expect(this.page.getByRole("status").filter({ hasText: "Cargando disfraces" })).toHaveCount(0);
  }

  async iniciarSesion(email: string, password: string) {
    await this.page.goto("/login");
    await this.page.getByLabel(/correo/i).fill(email);
    await this.page.getByLabel(/contraseña/i).fill(password);
    await this.page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(this.page).toHaveURL(/\/catalogo$/);
  }

  async agregar(nombre: string) {
    await this.tarjeta(nombre).getByRole("button", { name: "Agregar al carrito", exact: true }).click();
    await expect(this.page.getByRole("dialog", { name: "Tu carrito" })).toBeVisible();
  }
}
