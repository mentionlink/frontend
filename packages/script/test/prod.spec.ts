// Copyright 2024 Mentionlink. All rights reserved.
// Use of this source code is governed by the PolyForm Shield 1.0.0 license
// that can be found in the LICENSE.md file at the root of this repository.

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // https://mentionlink.com/spec.json
  await page.route(/v1/, route => route.fulfill({
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
  }));
  await page.goto("/prod.html");
});

test("if page has title", async ({ page }) => {
  await expect(page).toHaveTitle("Mentionlink prod tests");
});

test("if substrings are hyperlinked", async ({ page }) => {
  // Script does not hyperlink substrings in `h1` elements.
  await expect(page.locator("a", { hasText: "Google Pixel 9 Pro" })).not.toBeVisible();
  // Script does not hyperlink substrings in elements with parents decorated with the `data-mentionlink-ignore` attribute.
  await expect(page.locator("[data-mentionlink-ignore] a", { hasText: "Apple iPhone 16 Pro" })).not.toBeVisible();
  await expect(page.locator("a", { hasText: "Apple iPhone 16 Pro" })).toBeVisible();
});