import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model Component for Create Deck Modal
 * Implements resilient locators and reusable actions using data-testid attributes
 *
 * This component can be used across different pages where the modal appears
 */
export class CreateDeckModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly form: Locator;
  readonly nameInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly validationError: Locator;

  constructor(page: Page) {
    this.page = page;
    // Using data-testid for resilient, test-specific selectors
    this.modal = page.getByTestId("create-deck-modal");
    this.form = page.getByTestId("create-deck-form");
    this.nameInput = page.getByTestId("create-deck-name-input");
    this.submitButton = page.getByTestId("create-deck-submit-button");
    this.cancelButton = page.getByTestId("create-deck-cancel-button");
    this.validationError = page.getByRole("alert");
  }

  /**
   * Wait for modal to be visible
   */
  async waitForOpen() {
    await this.modal.waitFor({ state: "visible" });
  }

  /**
   * Wait for modal to be hidden
   */
  async waitForClose() {
    await this.modal.waitFor({ state: "hidden" });
  }

  /**
   * Check if modal is currently visible
   */
  async isOpen(): Promise<boolean> {
    return await this.modal.isVisible();
  }

  /**
   * Fill the deck name input
   */
  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  /**
   * Get current value of name input
   */
  async getNameValue(): Promise<string> {
    return await this.nameInput.inputValue();
  }

  /**
   * Submit the form to create deck
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Cancel the deck creation
   */
  async cancel() {
    await this.cancelButton.click();
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  /**
   * Check if cancel button is disabled
   */
  async isCancelDisabled(): Promise<boolean> {
    return await this.cancelButton.isDisabled();
  }

  /**
   * Get validation error message
   */
  async getValidationError(): Promise<string | null> {
    if (await this.validationError.isVisible()) {
      return await this.validationError.textContent();
    }
    return null;
  }

  /**
   * Check if there is a validation error
   */
  async hasValidationError(): Promise<boolean> {
    return await this.validationError.isVisible();
  }

  /**
   * Get remaining character count text
   */
  async getRemainingCharsText(): Promise<string | null> {
    const remainingChars = this.page.locator("text=/\\d+ characters remaining/");
    if (await remainingChars.isVisible()) {
      return await remainingChars.textContent();
    }
    return null;
  }

  /**
   * Complete flow: Fill form and submit
   */
  async createDeck(name: string) {
    await this.fillName(name);
    await this.submit();
  }
}
