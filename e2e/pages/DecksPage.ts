import type { Page, Locator } from "@playwright/test";
import { CreateDeckModal } from "./components/CreateDeckModal";

/**
 * Page Object Model for Decks Library Page
 * Implements resilient locators and reusable actions using data-testid attributes
 */
export class DecksPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly createDeckButtonDesktop: Locator;
  readonly createDeckButtonMobile: Locator;
  readonly createFirstDeckButton: Locator;
  readonly searchInput: Locator;
  readonly deckCards: Locator;
  readonly createDeckModal: CreateDeckModal;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole("heading", { name: /my decks/i });
    // Using data-testid for resilient, test-specific selectors
    this.createDeckButtonDesktop = page.getByTestId("create-deck-button-desktop");
    this.createDeckButtonMobile = page.getByTestId("create-deck-button-mobile");
    this.createFirstDeckButton = page.getByTestId("create-first-deck-button");
    this.searchInput = page.getByPlaceholder(/search/i);
    this.deckCards = page.getByTestId("deck-card");
    this.createDeckModal = new CreateDeckModal(page);
  }

  async goto() {
    await this.page.goto("/app/decks");
  }

  /**
   * Opens the create deck modal
   * Automatically detects which button to use based on:
   * 1. Empty state (no decks) - uses "Create Your First Deck" button
   * 2. Mobile/Desktop viewport - uses appropriate create button
   */
  async openCreateDeckModal() {
    // Check if empty state button is visible (when there are no decks)
    const isEmptyState = await this.createFirstDeckButton.isVisible();
    if (isEmptyState) {
      await this.createFirstDeckButton.click();
    } else {
      // Check if mobile button is visible, otherwise use desktop
      const isMobile = await this.createDeckButtonMobile.isVisible();
      if (isMobile) {
        await this.createDeckButtonMobile.click();
      } else {
        await this.createDeckButtonDesktop.click();
      }
    }
    await this.createDeckModal.waitForOpen();
  }

  /**
   * Complete flow: Create a new deck
   * Opens modal, fills form, and submits
   */
  async createDeck(name: string) {
    await this.openCreateDeckModal();
    await this.createDeckModal.fillName(name);
    await this.createDeckModal.submit();
    await this.createDeckModal.waitForClose();
  }

  async searchDecks(query: string) {
    await this.searchInput.fill(query);
  }

  async getDeckCount(): Promise<number> {
    return await this.deckCards.count();
  }

  async openDeck(deckName: string) {
    const deckCard = this.page.getByRole("button", { name: new RegExp(deckName, "i") });
    await deckCard.click();
  }

  async hasDeck(deckName: string): Promise<boolean> {
    const deckCard = this.page.getByRole("button", { name: new RegExp(deckName, "i") });
    return await deckCard.isVisible();
  }

  /**
   * Check if the page is showing the empty state (no decks)
   */
  async isEmpty(): Promise<boolean> {
    return await this.createFirstDeckButton.isVisible();
  }
}
