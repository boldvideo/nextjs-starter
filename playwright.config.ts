import { defineConfig, devices } from "@playwright/test";

const env = {
  BOLD_API_KEY: "voice-browser-test",
  NEXT_PUBLIC_BOLD_API_KEY: "voice-browser-test",
  BACKEND_URL: "http://127.0.0.1:4311/api/v1/",
  AUTH_ENABLED: "false",
  NEXT_PUBLIC_VIDEO_PATH_STYLE: "v",
};

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: { baseURL: "http://localhost:4310", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "bun tests/fixtures/voice-api.ts", port: 4311, reuseExistingServer: false },
    { command: "bun dev --port 4310", url: "http://localhost:4310/v/voice-demo", env, timeout: 120_000, reuseExistingServer: false },
  ],
});
