import { defineConfig } from "@playwright/test";

const PORT = 3100;
// E2E_BASE_URL=http://host:port runs the suite against an already running server (e.g. nginx).
const external = process.env.E2E_BASE_URL;
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: external ?? `http://localhost:${PORT}`, actionTimeout: 10_000 },
  expect: { timeout: 7_000 },
  webServer: external ? undefined : {
    command: `node scripts/serve-static.mjs out ${PORT}`,
    url: `http://localhost:${PORT}/ru/code`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
