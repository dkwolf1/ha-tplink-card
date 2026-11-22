import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: process.env.DECO_BROWSER_CHANNEL || undefined,
  },
  webServer: {
    command: "node scripts/serve.mjs",
    env: { DECO_PORT: "4173" },
    url: "http://127.0.0.1:4173/demo/",
    reuseExistingServer: false,
  },
});
