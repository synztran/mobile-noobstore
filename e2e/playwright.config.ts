import { defineConfig } from "@playwright/test";
import path from "path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: path.join(__dirname, "specs"),
  timeout: 60_000,
  retries: 1,
  globalSetup: path.join(__dirname, "global-setup.ts"),
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 390, height: 844 },
    actionTimeout: 15_000,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
