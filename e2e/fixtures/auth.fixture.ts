/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, type Page } from "@playwright/test";

/**
 * Extended test fixture with authentication setup
 * Use this for tests that require authenticated users
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  // Add custom fixtures here
  authenticatedPage: async ({ page }, use) => {
    // Perform authentication setup
    // Example: Set cookies, localStorage, etc.
    await page.goto("/login");

    // Perform login if needed
    // await page.fill('[name="email"]', 'test@example.com');
    // await page.fill('[name="password"]', 'password');
    // await page.click('button[type="submit"]');
    // await page.waitForURL('/app/decks');

    await use(page);
  },
});

export { expect } from "@playwright/test";
