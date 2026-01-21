import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Login Page
 * Implements resilient locators and reusable actions using data-testid attributes
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    // Using data-testid for resilient, test-specific selectors
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");
    this.errorMessage = page.getByRole("alert");
    this.registerLink = page.locator('a[href="/register"]');
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitForNavigation() {
    await this.page.waitForURL(/\/app\//);
  }

  async getErrorMessage(): Promise<string | null> {
    return await this.errorMessage.textContent();
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  async goToRegister() {
    await this.registerLink.click();
  }
}
