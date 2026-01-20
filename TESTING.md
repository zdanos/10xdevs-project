# Testing Guide

This project uses a comprehensive testing strategy with **Vitest** for unit/integration tests and **Playwright** for E2E tests.

## Table of Contents

- [Quick Start](#quick-start)
- [Unit Testing with Vitest](#unit-testing-with-vitest)
- [E2E Testing with Playwright](#e2e-testing-with-playwright)
- [Test Structure](#test-structure)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)

## Quick Start

### Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### Run Tests

```bash
# Run all unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with UI
npm run test:ui

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run all tests (unit + E2E)
npm run test:all
```

## Unit Testing with Vitest

### Overview

- **Test Runner**: Vitest
- **Test Utilities**: @testing-library/react
- **Environment**: jsdom
- **Coverage**: @vitest/coverage-v8

### Configuration

Configuration is in `vitest.config.ts`. Key features:

- jsdom environment for DOM testing
- Global test utilities (describe, it, expect)
- Path aliases matching tsconfig
- Coverage reporting
- Setup file with common mocks

### Writing Unit Tests

#### Test File Location

Place test files next to the code they test with `.test.ts` or `.test.tsx` extension:

```
src/
  lib/
    utils.ts
    utils.test.ts       # ✅ Unit test
  components/
    Button.tsx
    Button.test.tsx     # ✅ Component test
```

#### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

#### Testing React Components

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<MyComponent onClick={handleClick} />);
    
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Mocking

#### Mock Functions

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
mockFn.mockResolvedValue('async value');
```

#### Mock Modules

```typescript
import { vi } from 'vitest';

vi.mock('./module', () => ({
  myFunction: vi.fn(() => 'mocked'),
}));
```

#### Mock Supabase

Use the provided mock in `src/test/mocks/supabase.mock.ts`:

```typescript
import { createMockSupabaseClient } from '@/test/mocks/supabase.mock';

vi.mock('@/db/supabase.client', () => ({
  supabaseClient: createMockSupabaseClient(),
}));
```

#### Mock OpenAI

Use the provided mock in `src/test/mocks/openai.mock.ts`. **Note**: This mock uses the newer Responses API (`responses.parse`), not Chat Completions:

```typescript
import { createMockOpenAIClient, mockResponsesParseResponse } from '@/test/mocks/openai.mock';

vi.mock('openai', () => ({
  default: vi.fn(() => createMockOpenAIClient()),
}));
```

### Coverage

Run tests with coverage:

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## E2E Testing with Playwright

### Overview

- **Test Runner**: Playwright
- **Browser**: Chromium (Desktop Chrome)
- **Pattern**: Page Object Model
- **Features**: Visual testing, API testing, trace viewer

### Configuration

Configuration is in `playwright.config.ts`. Key features:

- Chromium browser only
- Automatic dev server start
- Screenshot on failure
- Video on failure
- Trace on retry
- Parallel execution

### Writing E2E Tests

#### Test File Location

Place E2E tests in the `e2e/` directory:

```
e2e/
  pages/          # Page Object Models
    LoginPage.ts
    DecksPage.ts
  fixtures/       # Test fixtures and setup
    auth.fixture.ts
  *.spec.ts       # Test files
```

#### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should perform action', async ({ page }) => {
    // Navigate
    await page.goto('/');
    
    // Interact
    await page.click('button');
    
    // Assert
    await expect(page).toHaveURL('/expected');
  });
});
```

#### Using Page Object Model

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Login', () => {
  test('should login successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('user@example.com', 'password');
    
    await expect(page).toHaveURL('/app/decks');
  });
});
```

#### Creating Page Objects

```typescript
import { Page, Locator } from '@playwright/test';

export class MyPage {
  readonly page: Page;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use resilient locators
    this.submitButton = page.getByRole('button', { name: /submit/i });
  }

  async goto() {
    await this.page.goto('/my-page');
  }

  async submit() {
    await this.submitButton.click();
  }
}
```

### Resilient Locators

Prefer these locator strategies (in order):

1. **Role-based**: `page.getByRole('button', { name: /submit/i })`
2. **Label-based**: `page.getByLabel(/email/i)`
3. **Text-based**: `page.getByText(/welcome/i)`
4. **Test ID**: `page.getByTestId('submit-btn')`
5. **CSS (last resort)**: `page.locator('.submit-btn')`

### Visual Testing

```typescript
test('should match screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});
```

### API Testing

```typescript
test('should verify API response', async ({ request }) => {
  const response = await request.get('/api/decks');
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data).toHaveLength(5);
});
```

### Debug Mode

Run tests in debug mode:

```bash
npm run test:e2e:debug
```

### Codegen Tool

Generate test code interactively:

```bash
npm run test:e2e:codegen
```

## Test Structure

```
project/
├── src/
│   ├── test/
│   │   ├── setup.ts              # Global test setup
│   │   ├── utils/
│   │   │   └── test-utils.tsx    # Custom render function
│   │   └── mocks/                # Test mocks
│   ├── lib/
│   │   └── utils.test.ts         # Unit tests
│   └── components/
│       └── Button.test.tsx       # Component tests
├── e2e/
│   ├── pages/                    # Page Object Models
│   ├── fixtures/                 # Test fixtures
│   └── *.spec.ts                 # E2E tests
├── vitest.config.ts              # Vitest configuration
└── playwright.config.ts          # Playwright configuration
```

## Best Practices

### Unit Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Names**: Test names should describe what they test
3. **Test One Thing**: Each test should verify one behavior
4. **Mock External Dependencies**: Use mocks for APIs, databases
5. **Avoid Implementation Details**: Test behavior, not implementation
6. **Use Type Safety**: Ensure mocks preserve type signatures

### E2E Tests

1. **Use Page Object Model**: Encapsulate page interactions
2. **Resilient Locators**: Prefer role/label over CSS selectors
3. **Independent Tests**: Each test should be self-contained
4. **Proper Setup/Teardown**: Use hooks for setup and cleanup
5. **Visual Regression**: Use screenshots for visual changes
6. **API Validation**: Test backend through API calls

### General

1. **Keep Tests Fast**: Mock slow operations in unit tests
2. **Maintain Test Data**: Use factories or fixtures for test data
3. **Review Coverage**: Focus on critical paths, not 100% coverage
4. **Update Tests**: Keep tests up to date with code changes
5. **Readable Assertions**: Use specific matchers and error messages

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
