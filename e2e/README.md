# E2E Tests

End-to-end tests using Playwright to verify the complete application flow from a user's perspective.

## Setup

### Environment Variables

E2E tests require valid test user credentials. Create a `.env.test` file in the project root with the following variables:

```bash
# Test user credentials for E2E tests
E2E_USERNAME=test@example.com
E2E_PASSWORD=your_test_password_here

# Optional: Custom base URL (defaults to http://localhost:3000)
# PLAYWRIGHT_BASE_URL=http://localhost:3000
```

**Important:** 
- The `.env.test` file is git-ignored and should NOT be committed
- Use a dedicated test account for E2E testing
- These credentials should be valid in your test environment

### Installation

```bash
# Install Playwright browsers
npx playwright install chromium
```

## Structure

```
e2e/
├── pages/              # Page Object Models
│   ├── LoginPage.ts
│   └── DecksPage.ts
├── fixtures/           # Test fixtures and custom test extensions
│   └── auth.fixture.ts
└── *.spec.ts          # Test files
```

## Page Object Model

Page Objects encapsulate page-specific selectors and actions, making tests more maintainable and reusable.

### Creating a Page Object

```typescript
import { Page, Locator } from '@playwright/test';

export class MyPage {
  readonly page: Page;
  readonly myButton: Locator;
  readonly myInput: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use resilient locators
    this.myButton = page.getByRole('button', { name: /submit/i });
    this.myInput = page.getByLabel(/email/i);
  }

  async goto() {
    await this.page.goto('/my-page');
  }

  async fillForm(email: string) {
    await this.myInput.fill(email);
    await this.myButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    const alert = this.page.getByRole('alert');
    return await alert.textContent();
  }
}
```

### Using Page Objects

```typescript
import { test, expect } from '@playwright/test';
import { MyPage } from './pages/MyPage';

test('should submit form', async ({ page }) => {
  const myPage = new MyPage(page);
  
  await myPage.goto();
  await myPage.fillForm('user@example.com');
  
  await expect(page).toHaveURL('/success');
});
```

## Fixtures

Fixtures provide setup and teardown logic for tests. Use them to create reusable test contexts.

### Custom Authentication Fixture

See `fixtures/auth.fixture.ts` for an example of a custom fixture that provides an authenticated page context.

#### Usage

```typescript
import { test, expect } from './fixtures/auth.fixture';

test('should access protected page', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/app/decks');
  await expect(authenticatedPage).toHaveURL('/app/decks');
});
```

### Creating Custom Fixtures

```typescript
import { test as base } from '@playwright/test';

export const test = base.extend({
  myFixture: async ({ page }, use) => {
    // Setup
    await page.goto('/setup');
    
    // Provide fixture
    await use(page);
    
    // Teardown
    await page.goto('/cleanup');
  },
});

export { expect } from '@playwright/test';
```

## Locator Strategies

Use resilient locators that are less likely to break when the UI changes:

### Recommended (Best to Worst)

1. **Role-based locators** (BEST)
   ```typescript
   page.getByRole('button', { name: /submit/i })
   page.getByRole('link', { name: /login/i })
   page.getByRole('heading', { name: /welcome/i })
   ```

2. **Label-based locators**
   ```typescript
   page.getByLabel(/email/i)
   page.getByLabel(/password/i)
   ```

3. **Placeholder locators**
   ```typescript
   page.getByPlaceholder(/search/i)
   ```

4. **Text locators**
   ```typescript
   page.getByText(/welcome back/i)
   ```

5. **Test ID locators**
   ```typescript
   page.getByTestId('submit-btn')
   ```

6. **CSS selectors** (LAST RESORT)
   ```typescript
   page.locator('.submit-btn')
   page.locator('#email-input')
   ```

### Why Role-based Locators?

- More accessible (ensures proper ARIA roles)
- More resilient to styling changes
- Self-documenting (tells you what the element is)
- Encourages better HTML semantics

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/my-page');
    
    // Act
    await page.getByRole('button', { name: /submit/i }).click();
    
    // Assert
    await expect(page).toHaveURL('/success');
  });
});
```

### Handling Async Actions

```typescript
test('should wait for element', async ({ page }) => {
  await page.goto('/');
  
  // Wait for element to be visible
  const element = page.getByText('Loading complete');
  await expect(element).toBeVisible();
});

test('should wait for navigation', async ({ page }) => {
  await page.goto('/');
  
  const button = page.getByRole('button', { name: /submit/i });
  await button.click();
  
  // Wait for URL change
  await page.waitForURL('/success');
  await expect(page).toHaveURL('/success');
});

test('should wait for network', async ({ page }) => {
  await page.goto('/');
  
  // Wait for API call
  const responsePromise = page.waitForResponse('/api/decks');
  await page.getByRole('button', { name: /load/i }).click();
  const response = await responsePromise;
  
  expect(response.ok()).toBeTruthy();
});
```

### Visual Testing

```typescript
test('should match screenshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Full page screenshot
  await expect(page).toHaveScreenshot('homepage.png');
  
  // Element screenshot
  const header = page.getByRole('banner');
  await expect(header).toHaveScreenshot('header.png');
});
```

### API Testing

```typescript
test('should verify API', async ({ request }) => {
  const response = await request.get('/api/decks');
  
  expect(response.ok()).toBeTruthy();
  
  const data = await response.json();
  expect(data).toHaveLength(5);
  expect(data[0]).toHaveProperty('name');
});
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug

# Generate test code interactively
npm run test:e2e:codegen
```

## Debugging

### Using UI Mode

```bash
npm run test:e2e:ui
```

UI mode provides:
- Time travel through test steps
- Visual test picker
- Watch mode
- Screenshot/video viewer

### Using Debug Mode

```bash
npm run test:e2e:debug
```

Debug mode:
- Opens Playwright Inspector
- Step through tests
- Explore page state
- Edit locators live

### Using Trace Viewer

When a test fails, a trace is automatically recorded. View it with:

```bash
npx playwright show-trace trace.zip
```

## Best Practices

1. **Use Page Objects**: Encapsulate page logic
2. **Independent Tests**: Each test should work in isolation
3. **Resilient Locators**: Prefer role/label over CSS
4. **Explicit Waits**: Use `expect()` for auto-waiting
5. **Descriptive Names**: Test names should describe user behavior
6. **Small Tests**: One user flow per test
7. **Setup/Teardown**: Use hooks and fixtures
8. **Visual Regression**: Use screenshots for visual changes
9. **Parallel Execution**: Tests run in parallel by default
10. **Test Data**: Use fixtures or factories for test data

## Common Patterns

### Login Flow

```typescript
test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  
  await expect(page).toHaveURL('/app/decks');
});
```

### Form Validation

```typescript
test('should show validation errors', async ({ page }) => {
  await page.goto('/register');
  
  const submitButton = page.getByRole('button', { name: /register/i });
  await submitButton.click();
  
  const errorMessage = page.getByRole('alert');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText('Email is required');
});
```

### Navigation

```typescript
test('should navigate through app', async ({ page }) => {
  await page.goto('/');
  
  await page.getByRole('link', { name: /login/i }).click();
  await expect(page).toHaveURL('/login');
  
  await page.getByRole('link', { name: /register/i }).click();
  await expect(page).toHaveURL('/register');
});
```

## Troubleshooting

### Tests timing out

- Increase timeout in config
- Check if selectors are correct
- Use debug mode to inspect

### Flaky tests

- Use auto-waiting with `expect()`
- Avoid `page.waitForTimeout()`
- Check for race conditions
- Use `page.waitForLoadState()`

### Screenshots not matching

- Update screenshots: `npm run test:e2e -- --update-snapshots`
- Check for animations/transitions
- Wait for images to load
- Consider using `waitForLoadState('networkidle')`
