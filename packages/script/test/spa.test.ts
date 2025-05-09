// Copyright 2024 Mention Ads. All rights reserved.
// Use of this source code is governed by the PolyForm Shield 1.0.0 license
// that can be found in the LICENSE.md file at the root of this repository.

import { test, expect } from "@playwright/test";

let magicRouteCallCount: number;

test.beforeEach(async ({ page }) => {
  magicRouteCallCount = 0;

  // https://mentionads.com/spec.json
  await page.route(/v1/, route => {
    magicRouteCallCount++;

    return route.fulfill({
      json: {
        rewrites: [],
        mentions: [{
          substring: "Google Pixel 9 Pro",
          title: "Google Pixel 9 Pro",
          url: "https://www.google.com",
        }, {
          substring: "Apple iPhone 16 Pro",
          title: "Apple iPhone 16 Pro",
          url: "https://www.apple.com",
        }],
      },
    });
  });
  await page.goto("/spa.html");
});

test("if page has title", async ({ page }) => {
  await expect(page).toHaveTitle(/Mention Ads SPA tests/);
});

test("if route is called multiple times", async ({ page }) => {
  // Waits twice as much as the timeout in the script.
  await page.waitForTimeout(10e3);

  expect(magicRouteCallCount).toBe(2);
});