import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

test('TC-FE-ENV-01: npm run dev sirve la aplicación React en el navegador', async ({ page, baseURL }) => {
  // Este caso solo verifica el entorno frontend: ningún acceso a API o BD.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === baseURL ? route.continue() : route.abort();
  });
  const errores: string[] = [];
  page.on('pageerror', error => errores.push(error.message));
  const respuesta = await page.goto('/login');
  expect(respuesta?.status()).toBe(200);
  await expect(page.locator('#root form')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
  const modulo = await page.request.get('/src/main.tsx');
  expect(modulo.status()).toBe(200);
  expect(modulo.headers()['content-type']).toContain('javascript');
  expect(await modulo.text()).toContain('createRoot');
  expect(errores).toEqual([]);
  const carpeta = path.resolve('../tests/auditoria/entorno');
  await mkdir(carpeta, { recursive: true });
  await page.screenshot({ path: path.join(carpeta, 'TC-FE-ENV-01.png') });
  await writeFile(path.join(carpeta, 'resultado.json'), JSON.stringify({
    caso: 'TC-FE-ENV-01', fechaUTC: new Date().toISOString(),
    estado: 'APROBADO_TECNICAMENTE', comando: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
    htmlHTTP: 200, moduloHTTP: 200, formularioReactVisible: true,
    erroresJavaScript: errores, accesoBackend: false, aceptacionUAT: 'Pendiente del equipo',
  }, null, 2) + '\n');
});
