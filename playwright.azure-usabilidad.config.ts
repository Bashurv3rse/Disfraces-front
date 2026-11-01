
import { defineConfig } from "@playwright/test";
import azure from "./playwright.azure.config";

export default defineConfig({
  ...azure,
  testDir: "./tests/usabilidad",
  reporter: [
    ["list"],
    [
      "html", {
        outputFolder: "playwright-report-azure-usabilidad",
        open: "never",
      },
    ],
  ],
});
