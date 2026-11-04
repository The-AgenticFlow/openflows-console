// Playwright configuration for the Console's end-to-end tests.
//
// The tests drive the real Console in a real browser against the fake Manager
// in e2e/support (see its header). Two servers are started: the fake Manager on
// 3999 and the Console, built and served on 3100 from its own build directory
// (`.next-e2e`, set through NEXT_DIST_DIR in next.config.ts) so a running
// `pnpm dev` on :3000 is never disturbed. The browser is the system Chrome
// (`channel: "chrome"`), so no browser download is needed; in CI, Chrome is
// preinstalled on the GitHub-hosted runners.
import { defineConfig } from "@playwright/test";

const CONSOLE = "http://127.0.0.1:3100";
const MANAGER = "http://127.0.0.1:3999";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: CONSOLE, channel: "chrome", trace: "retain-on-failure" },
  webServer: [
    { command: "node e2e/support/fake-manager.mjs", url: `${MANAGER}/__health`, reuseExistingServer: !process.env.CI },
    {
      command: "pnpm build && pnpm start -p 3100",
      url: `${CONSOLE}/login`,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      env: { NEXT_DIST_DIR: ".next-e2e", OPENFLOWS_MANAGER_URL: MANAGER },
    },
  ],
});
