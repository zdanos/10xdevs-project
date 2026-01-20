import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

/**
 * Example E2E test demonstrating:
 * - Page Object Model usage
 * - Resilient locators
 * - Visual comparison
 * - Proper test structure
 */
test.describe("Landing Page", () => {
  test("should display the landing page correctly", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Check page title
    await expect(page).toHaveTitle(/FlashCard AI/i);

    // Verify main heading is visible
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
  });
});

test.describe("Login Page", () => {
  test("should display login form", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verify form elements are visible
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Attempt login with invalid credentials
    await loginPage.login("invalid@example.com", "wrongpassword");

    // Verify error message appears
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test("should navigate to register page", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.goToRegister();

    // Verify navigation
    await expect(page).toHaveURL(/\/register/);
  });
});
