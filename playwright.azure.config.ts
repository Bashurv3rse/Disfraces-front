
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/cloud",

  fullyParallel: false,
  workers: 1,
  retries: 0,

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report-azure",
        open: "never",
      },
    ],
  ],

  use: {
    ...devices["Desktop Chrome"],
    baseURL: "https://black-desert-044a63b10.2.azurestaticapps.net",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
