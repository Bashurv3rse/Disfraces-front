import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({ ...base, testDir: "./tests/stripe-real", timeout: 180_000,
  workers: 1, retries: 0, reporter: [["list"], ["html", { outputFolder: "playwright-report-stripe-real", open: "never" }]],
});
