import { defineConfig } from '@playwright/test';
import base from './playwright.stripe.config';

process.env.STRIPE_COEXISTENCIA = '1';
export default defineConfig({ ...base, testMatch: 'reembolso.spec.ts',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-coexistencia', open: 'never' }]],
});
