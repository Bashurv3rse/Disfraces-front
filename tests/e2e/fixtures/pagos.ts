import { test as base, expect } from "./catalogo";

export const test = base.extend<{ stripeSimulado: void }>({
  stripeSimulado: [async ({ request }, proveer) => {
    // Falla ANTES de pulsar Pagar si alguien arrancó el backend normal o una pasarela real.
    const respuesta = await request.get("http://localhost:3000/__e2e/stripe");
    expect(respuesta.status(), "Inicia backend con npm run start:test:pagos para estas pruebas").toBe(200);
    expect(await respuesta.json()).toEqual({ modo: "stripe-simulado", base: "disfraz_test_db" });
    await proveer();
  }, { auto: true }],
});
export { expect };
