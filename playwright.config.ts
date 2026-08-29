import { defineConfig, devices } from "@playwright/test";
import { BACKEND_PORT, FRONTEND_PORT } from "./e2e/ports";

/**
 * E2E tests boot dedicated backend + frontend instances on ports separate
 * from the normal dev workflow (4020 / 5180), with an in-memory SQLite DB,
 * so a test run never touches a developer's real dev servers or data.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run start:backend",
      url: `http://localhost:${BACKEND_PORT}/event-types`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        PORT: String(BACKEND_PORT),
        BOOKING_DB_PATH: ":memory:",
      },
    },
    {
      command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        VITE_API_BASE_URL: `http://localhost:${BACKEND_PORT}`,
      },
    },
  ],
});
