# Test Utilities

This directory contains shared testing utilities, mocks, and setup files for unit and integration tests.

## Structure

```
test/
├── setup.ts              # Global test setup and environment configuration
├── utils/
│   └── test-utils.tsx    # Custom render functions and test utilities
└── mocks/
    ├── supabase.mock.ts  # Supabase client mocks
    └── openai.mock.ts    # OpenAI API mocks
```

## Setup File (`setup.ts`)

The setup file runs before all tests and configures:

- Global test matchers from `@testing-library/jest-dom`
- Automatic cleanup after each test
- Mock implementations for browser APIs:
  - `ResizeObserver`
  - `IntersectionObserver`
  - `window.matchMedia`
  - `window.scrollTo`

These are configured automatically - you don't need to import or configure them in your tests.

## Test Utils (`utils/test-utils.tsx`)

Provides a custom `render` function that wraps components with necessary providers.

### Usage

```typescript
import { render, screen } from '@/test/utils/test-utils';
import { MyComponent } from './MyComponent';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Adding Global Providers

To add providers (like Context, Router, etc.) to all tests, edit the `AllProviders` component in `test-utils.tsx`:

```typescript
const AllProviders = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
};
```

## Mocks

### Supabase Mock (`mocks/supabase.mock.ts`)

Provides mock implementations for Supabase client methods.

#### Usage

```typescript
import { vi } from 'vitest';
import { createMockSupabaseClient } from '@/test/mocks/supabase.mock';

// Mock the entire module
vi.mock('@/db/supabase.client', () => ({
  supabaseClient: createMockSupabaseClient(),
}));

// Or use in specific tests
const mockClient = createMockSupabaseClient();
mockClient.from('decks').select.mockResolvedValue({
  data: [{ id: '1', name: 'Test Deck' }],
  error: null,
});
```

### OpenAI Mock (`mocks/openai.mock.ts`)

Provides mock implementations for OpenAI Responses API calls.

**Important**: This mock uses the newer `responses.parse()` API, not the older Chat Completions API.

#### Usage

```typescript
import { vi } from 'vitest';
import { createMockOpenAIClient, mockResponsesParseResponse, mockFlashcardsData } from '@/test/mocks/openai.mock';

// Mock the module
vi.mock('openai', () => ({
  default: vi.fn(() => createMockOpenAIClient()),
}));

// Or customize the response
const mockClient = createMockOpenAIClient();
mockClient.responses.parse.mockResolvedValue({
  ...mockResponsesParseResponse,
  output_parsed: {
    flashcards: mockFlashcardsData,
  },
});
```

## Best Practices

1. **Reuse Mocks**: Use the provided mocks instead of creating new ones in each test
2. **Reset Mocks**: Mocks are automatically cleared after each test via `setup.ts`
3. **Type Safety**: All mocks preserve TypeScript types for better IDE support
4. **Isolation**: Each test should be independent and not rely on shared state
5. **Custom Matchers**: Use jest-dom matchers like `toBeInTheDocument()`, `toHaveClass()`, etc.

## Adding New Mocks

When adding new mocks, follow this pattern:

```typescript
// src/test/mocks/myservice.mock.ts
import { vi } from 'vitest';

export const mockMyService = {
  method: vi.fn(),
  anotherMethod: vi.fn(),
};

export const createMockMyService = () => ({
  ...mockMyService,
  method: vi.fn(),
  anotherMethod: vi.fn(),
});
```

Then use it in tests:

```typescript
vi.mock('@/lib/services/myservice', () => ({
  myService: createMockMyService(),
}));
```
