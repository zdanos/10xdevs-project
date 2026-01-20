import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Decks Library Page
 * Implements resilient locators and reusable actions
 */
export class DecksPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly createDeckButton: Locator;
  readonly searchInput: Locator;
  readonly deckCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole("heading", { name: /decks|library/i });
    this.createDeckButton = page.getByRole("button", { name: /create|new deck/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.deckCards = page.getByTestId("deck-card");
  }

  async goto() {
    await this.page.goto("/app/decks");
  }

  async createDeck(name: string, description?: string) {
    await this.createDeckButton.click();

    const nameInput = this.page.getByLabel(/name/i);
    await nameInput.fill(name);

    if (description) {
      const descInput = this.page.getByLabel(/description/i);
      await descInput.fill(description);
    }

    const submitButton = this.page.getByRole("button", { name: /create|save/i });
    await submitButton.click();
  }

  async searchDecks(query: string) {
    await this.searchInput.fill(query);
  }

  async getDeckCount(): Promise<number> {
    return await this.deckCards.count();
  }

  async openDeck(deckName: string) {
    const deckCard = this.page.getByRole("link", { name: new RegExp(deckName, "i") });
    await deckCard.click();
  }
}
