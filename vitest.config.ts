import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  test: {
    environment: "jsdom",

    include: [
      "tests/funcional/**/*.test.ts",
      "tests/funcional/**/*.test.tsx",
    ],

    setupFiles: [
      "./tests/setup.ts",
    ],

    coverage: {
      provider: "v8",

      include: [
        "src/**/*.ts",
        "src/**/*.tsx",
      ],

      exclude: [
        "src/**/*.d.ts",
      ],

      reporter: [
        "text",
        "html",
        "json-summary",
      ],

      reportsDirectory: "./coverage",
    },
  },
});