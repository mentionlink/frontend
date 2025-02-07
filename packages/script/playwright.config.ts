// Copyright 2024 Mention Ads. All rights reserved.
// Use of this source code is governed by the PolyForm Shield 1.0.0 license
// that can be found in the LICENSE.md file at the root of this repository.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:9000",
    trace: "on-first-retry",
    headless: !!process.env.CI,
  },
  projects: [{
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  }, {
    name: "firefox",
    use: { ...devices["Desktop Firefox"] },
  }, {
    name: "webkit",
    use: { ...devices["Desktop Safari"] },
  }],
  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:9000",
    reuseExistingServer: !process.env.CI,
  },
});