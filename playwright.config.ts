import { defineConfig } from "@playwright/test";

const PORT = 3100;
const API_PORT = 8100;
export const E2E_BOT_TOKEN = "123456:E2E-TOKEN";
// E2E_BASE_URL=http://host:port runs the suite against an already running server (e.g. nginx).
const external = process.env.E2E_BASE_URL;
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: external ?? `http://localhost:${PORT}`, actionTimeout: 10_000 },
  expect: { timeout: 7_000 },
  webServer: external ? undefined : [
    {
      // fresh database every run; a test Telegram bot token so signed widget payloads can be checked
      command: `rm -f .cache/e2e.db* && mkdir -p .cache && cd backend && RITM_DB=../.cache/e2e.db RITM_COOKIE_SECURE=0 RITM_TELEGRAM_BOT_TOKEN=${E2E_BOT_TOKEN} RITM_TELEGRAM_BOT_NAME=ritm_e2e_bot ../.venv-api/bin/uvicorn ritm_api.main:create_app --factory --port ${API_PORT}`,
      url: `http://127.0.0.1:${API_PORT}/api/config`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `API_URL=http://127.0.0.1:${API_PORT} node scripts/serve-static.mjs out ${PORT}`,
      url: `http://localhost:${PORT}/ru/code`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
