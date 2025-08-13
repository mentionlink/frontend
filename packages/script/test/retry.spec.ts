// Copyright 2025 Mentionlink. All rights reserved.
// Use of this source code is governed by the PolyForm Shield 1.0.0 license
// that can be found in the LICENSE.md file at the root of this repository.

import { test, expect } from "@playwright/test";

const retryAfterSeconds = 10;

test.beforeEach(async ({ page }) => {
  let retry = 0;

  // https://mentionlink.com/spec.json
  await page.route(/script/, route => {
    if (retry++ === 0) {
      return route.fulfill({
        status: 202,
        headers: {
          "retry-after": retryAfterSeconds.toString(),
        },
      });
    }

    // Simulates a successful response after the first retry.
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
  await page.goto("/retry.html");
});

test("if page has title", async ({ page }) => {
  await expect(page).toHaveTitle("Mentionlink retry tests");
});

test("if substrings are not hyperlinked at first but are hyperlinked after the first retry", async ({ page }) => {
  await expect(page.locator("a", { hasText: "Apple iPhone 16 Pro" })).not.toBeVisible();

  // Wait for the retry to complete with at most double the retry time.
  await page.waitForTimeout(retryAfterSeconds * 2e3);

  await expect(page.locator("a", { hasText: "Apple iPhone 16 Pro" })).toBeVisible();
});