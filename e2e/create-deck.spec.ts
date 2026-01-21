import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { DecksPage } from "./pages/DecksPage";

/**
 * E2E Test: Create Deck Flow
 *
 * Scenario:
 * 1. Login to the app
 * 2. Click into new deck button
 * 3. Wait for dialog to be opened
 * 4. Name the new deck
 * 5. Save the deck
 */
test.describe("Create Deck Flow", () => {
  let loginPage: LoginPage;
  let decksPage: DecksPage;

  // Test credentials from environment variables
  // Validate and assert they exist before tests run
  test.beforeAll(() => {
    if (!process.env.E2E_USERNAME || !process.env.E2E_PASSWORD) {
      throw new Error("E2E_USERNAME and E2E_PASSWORD environment variables must be set in .env.test file");
    }
  });

  const getCredentials = () => ({
    email: process.env.E2E_USERNAME as string,
    password: process.env.E2E_PASSWORD as string,
  });

  test.beforeEach(async ({ page }) => {
    // Arrange: Initialize page objects
    loginPage = new LoginPage(page);
    decksPage = new DecksPage(page);
  });

  test.describe.configure({ mode: "serial" });

  test("should handle empty state and use 'Create Your First Deck' button", async () => {
    // Arrange
    const { email, password } = getCredentials();

    // Act: Login
    await loginPage.goto();
    await loginPage.login(email, password);
    await loginPage.waitForNavigation();

    // Note: This test assumes the user has no decks initially
    // If empty state is shown, the special empty state button should be used
    const isEmpty = await decksPage.isEmpty();

    if (isEmpty) {
      // Assert: Empty state button is visible
      await expect(decksPage.createFirstDeckButton).toBeVisible();
      await expect(decksPage.createDeckButtonDesktop).not.toBeVisible();
      await expect(decksPage.createDeckButtonMobile).not.toBeVisible();

      // Act: Create first deck using empty state button
      const deckName = "First Deck";
      await decksPage.createDeck(deckName);

      // Assert: Deck created and empty state is gone
      await expect(decksPage.hasDeck(deckName)).resolves.toBe(true);
      await expect(decksPage.isEmpty()).resolves.toBe(false);
    } else {
      // If user already has decks, the regular buttons should be visible
      // This test will be skipped in this scenario
      test.skip();
    }
  });

  test("should successfully create a new deck after login", async ({ page }) => {
    // Arrange
    const { email, password } = getCredentials();
    const deckName = "Spanish Vocabulary";

    // Act: Step 1 - Login to the app
    await loginPage.goto();
    await loginPage.login(email, password);
    await loginPage.waitForNavigation();

    // Assert: Login successful - redirected to decks page
    await expect(page).toHaveURL(/\/app\/decks/);

    // Act: Step 2 - Click new deck button
    await decksPage.openCreateDeckModal();

    // Assert: Step 3 - Dialog is opened
    await expect(decksPage.createDeckModal.modal).toBeVisible();

    // Act: Step 4 - Name the new deck
    await decksPage.createDeckModal.fillName(deckName);

    // Assert: Verify name is filled correctly
    await expect(decksPage.createDeckModal.nameInput).toHaveValue(deckName);

    // Act: Step 5 - Save the deck
    await decksPage.createDeckModal.submit();

    // Assert: Modal closes after successful creation
    await decksPage.createDeckModal.waitForClose();
    await expect(decksPage.createDeckModal.modal).not.toBeVisible();

    // Assert: New deck appears in the library
    await expect(decksPage.hasDeck(deckName)).resolves.toBe(true);
  });

  test("should create deck using simplified helper method", async ({ page }) => {
    // Arrange
    const { email, password } = getCredentials();
    const deckName = "German Grammar";

    // Act & Assert: Complete flow using helper methods
    await loginPage.goto();
    await loginPage.login(email, password);
    await loginPage.waitForNavigation();

    await expect(page).toHaveURL(/\/app\/decks/);

    // Use the high-level helper method
    await decksPage.createDeck(deckName);

    // Assert: New deck appears in the library
    await expect(decksPage.hasDeck(deckName)).resolves.toBe(true);
  });

  test("should disable submit button when deck name is empty", async () => {
    // Arrange
    const { email, password } = getCredentials();

    // Act: Login and open modal
    await loginPage.goto();
    await loginPage.login(email, password);
    await loginPage.waitForNavigation();
    await decksPage.openCreateDeckModal();

    // Assert: Submit button is disabled when input is empty
    await expect(decksPage.createDeckModal.submitButton).toBeDisabled();

    // Act: Fill in a name
    await decksPage.createDeckModal.fillName("Test Deck");

    // Assert: Submit button is enabled
    await expect(decksPage.createDeckModal.submitButton).toBeEnabled();
  });

  test("should cancel deck creation", async () => {
    // Arrange
    const { email, password } = getCredentials();
    const deckName = "Test Deck";

    // Act: Login and open modal
    await loginPage.goto();
    await loginPage.login(email, password);
    await loginPage.waitForNavigation();
    await decksPage.openCreateDeckModal();

    // Act: Fill name but cancel
    await decksPage.createDeckModal.fillName(deckName);
    await decksPage.createDeckModal.cancel();

    // Assert: Modal closes without creating deck
    await expect(decksPage.createDeckModal.modal).not.toBeVisible();
    await expect(decksPage.hasDeck(deckName)).resolves.toBe(false);
  });

  test("should work on mobile viewport", async ({ page }) => {
    // Arrange: Set mobile viewport
    const { email, password } = getCredentials();
    await page.setViewportSize({ width: 375, height: 667 });
    const deckName = "Mobile Deck";

    // Act: Login
    await loginPage.goto();
    await loginPage.login(email, password);
    await loginPage.waitForNavigation();

    // Assert: Mobile create button is visible
    await expect(decksPage.createDeckButtonMobile).toBeVisible();
    await expect(decksPage.createDeckButtonDesktop).not.toBeVisible();

    // Act: Create deck (auto-detects mobile button)
    await decksPage.createDeck(deckName);

    // Assert: Deck created successfully
    await expect(decksPage.hasDeck(deckName)).resolves.toBe(true);
  });
});
