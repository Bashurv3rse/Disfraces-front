
import { defineConfig } from "@playwright/test";
import azure from "./playwright.azure-usabilidad.config";

export default defineConfig({
  ...azure,
  use: {
    ...azure.use,
    baseURL: "http://localhost:5173",
  },
  reporter: [["list"]],
});
