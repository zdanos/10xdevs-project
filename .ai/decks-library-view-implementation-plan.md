# View Implementation Plan: Deck Library

## 1. Overview

The Deck Library view serves as the central hub for managing all user flashcard decks. This is an SSR (Server-Side Rendered) view built with Astro 5 that hydrates interactive React 19 components for enhanced user experience. The view displays all user decks in alphabetical order (A-Z), provides client-side search functionality, and enables deck creation through a modal interface. The design follows a mobile-first approach with a clean, minimalist aesthetic using green as the primary action color.

**Key Capabilities:**
- Display all user decks with card counts
- Create new decks via modal
- Search/filter decks by name (client-side)
- Navigate to individual deck details
- Handle loading, error, and empty states
- Responsive grid layout adapting to screen size

## 2. View Routing

**Path:** `/app/decks`

**Rendering Strategy:** SSR (Server-Side Rendering) with hydrated React Islands

**Authentication:** Protected route (requires authenticated user)

**Layout:** Uses the application layout with bottom navigation (mobile) or sidebar navigation (desktop)

## 3. Component Structure

```
/app/decks (DecksPage.astro) [SSR]
└── DecksLibrary (React Island - client:load)
    ├── Header Section
    │   ├── PageTitle ("My Decks")
    │   └── CreateDeckButton
    ├── SearchFilter (conditional - hidden if no decks)
    ├── Content Section (conditional rendering)
    │   ├── LoadingState (when isLoading === true)
    │   ├── ErrorState (when error !== null)
    │   ├── EmptyState (when decks.length === 0 && no error)
    │   ├── NoResultsState (when filteredDecks.length === 0 && searchQuery !== "")
    │   └── DeckGrid (when decks exist)
    │       └── DeckCard[] (multiple instances)
    └── CreateDeckModal (conditional - when showCreateModal === true)
        └── CreateDeckForm
            ├── Input (deck name)
            ├── ValidationMessage (conditional)
            └── ActionButtons (Cancel, Create)
```

## 4. Component Details

### 4.1. DecksPage.astro

**Description:** The main Astro page component for `/app/decks` route. Handles server-side data fetching and initial render. Passes fetched data to the React island for hydration.

**Main Elements:**
- `<Layout>` wrapper with page metadata
- `<DecksLibrary>` React island component with `client:load` directive
- Server-side API call to fetch initial deck data
- Error boundary for SSR failures

**Handled Interactions:** None (static SSR component)

**Validation:** None

**Types:**
- `ListDecksResponseDTO` (from src/types.ts)

**Props:** None (page component)

**Implementation Notes:**
- Fetch decks server-side using `fetch('/api/decks')`
- Handle SSR errors gracefully with error page
- Pass initial data as props to DecksLibrary
- Set appropriate page title and meta tags

### 4.2. DecksLibrary

**Description:** Main React island component orchestrating the entire Deck Library view. Manages state for decks, search, creation modal, and all user interactions. Acts as the container for all child components.

**Main Elements:**
- Container `<div>` with responsive padding and layout
- Conditional rendering logic for different states (loading, error, empty, content)
- State management via custom `useDecksLibrary` hook
- Toast notifications for user feedback

**Handled Interactions:**
- Deck creation (open/close modal, submit)
- Search filtering (text input changes)
- Error retry (refetch decks)
- Navigation to deck details

**Validation:** None (delegated to child components)

**Types:**
- `DecksLibraryViewState` (ViewModel)
- `DeckDTO[]` (from src/types.ts)
- `ApiError` (from src/types.ts)

**Props:**
```typescript
interface DecksLibraryProps {
  initialDecks: DeckDTO[];
  initialError?: ApiError | null;
}
```

**State (via useDecksLibrary hook):**
```typescript
interface DecksLibraryViewState {
  decks: DeckDTO[];
  filteredDecks: DeckDTO[];
  searchQuery: string;
  isLoading: boolean;
  error: ApiError | null;
  showCreateModal: boolean;
  isCreating: boolean;
  createError: string | null;
}
```

### 4.3. DeckGrid

**Description:** Responsive grid layout component displaying deck cards. Adapts from single column on mobile to multi-column grid on larger screens. Uses CSS Grid for flexible, accessible layout.

**Main Elements:**
- Container `<section>` with responsive grid classes
- Maps over `filteredDecks` to render `DeckCard` components
- Implements gap spacing between cards
- Responsive breakpoints: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)

**Handled Interactions:** None (pure presentational)

**Validation:** None

**Types:**
- `DeckDTO[]` (from src/types.ts)

**Props:**
```typescript
interface DeckGridProps {
  decks: DeckDTO[];
}
```

### 4.4. DeckCard

**Description:** Individual deck card displaying deck information and serving as navigation link to deck details. Shows deck name, card count, and optional metadata. Includes hover/focus states for accessibility.

**Main Elements:**
- Clickable card container (styled `<a>` or `<button>` with navigation)
- Deck name display (`<h3>`)
- Card count badge/indicator
- Visual hover/focus feedback
- Responsive typography scaling

**Handled Interactions:**
- Click: Navigate to `/app/decks/{id}`
- Keyboard navigation (Enter/Space)

**Validation:** None

**Types:**
- `DeckDTO` (from src/types.ts)

**Props:**
```typescript
interface DeckCardProps {
  deck: DeckDTO;
}
```

**Visual Design:**
- Card background: White with subtle shadow
- Border: Light gray (slate-200)
- Hover: Border changes to green (primary color)
- Typography: Deck name (text-lg font-semibold), card count (text-sm text-slate-600)
- Padding: p-4 (mobile), p-6 (desktop)
- Border radius: rounded-lg

### 4.5. SearchFilter

**Description:** Search input component enabling real-time client-side filtering of decks by name. Includes debouncing for performance and clear button for UX.

**Main Elements:**
- Search input field (`<input type="search">`)
- Search icon (leading)
- Clear button (trailing, conditional)
- Debouncing logic (300ms)
- Responsive sizing

**Handled Interactions:**
- Text input change: Updates search query, filters decks
- Clear button click: Resets search query
- Focus/blur states for accessibility

**Validation:**
- No validation required (any text allowed)
- Empty string is valid (shows all decks)

**Types:**
- `string` (search query)

**Props:**
```typescript
interface SearchFilterProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}
```

**Implementation Notes:**
- Use `useDeferredValue` or debounce for performance
- Filter logic: case-insensitive substring match
- Show clear button only when value is not empty
- Use shadcn/ui Input component

### 4.6. CreateDeckButton

**Description:** Primary action button that opens the deck creation modal. Prominently styled with green primary color. Fixed position on mobile (floating action button) or inline on desktop.

**Main Elements:**
- Button element with icon and text
- Responsive positioning (FAB on mobile, inline on desktop)
- Plus icon from icon library
- Focus/hover states

**Handled Interactions:**
- Click: Opens CreateDeckModal (sets `showCreateModal` to true)

**Validation:** None

**Types:** None

**Props:**
```typescript
interface CreateDeckButtonProps {
  onClick: () => void;
  disabled?: boolean;
}
```

**Visual Design:**
- Mobile: Floating Action Button (fixed bottom-right)
- Desktop: Standard button in header
- Color: Green (primary)
- Icon: Plus sign
- Text: "New Deck" (hidden on mobile, shown on desktop)

### 4.7. CreateDeckModal

**Description:** Modal dialog for creating new decks. Contains form with deck name input, validation feedback, and action buttons. Implements focus trap and escape key handling for accessibility.

**Main Elements:**
- Modal overlay (backdrop with blur)
- Modal container (centered card)
- Modal header with title ("Create New Deck")
- Form with deck name input
- Validation error messages (conditional)
- Action buttons (Cancel, Create)
- Close button (X icon)

**Handled Interactions:**
- Form submit: Validates input, calls API, handles response
- Cancel button: Closes modal without saving
- Escape key: Closes modal
- Click outside: Closes modal
- Close button: Closes modal

**Validation (detailed):**
1. **Required Field:**
   - Condition: `name.trim().length === 0`
   - Error: "Deck name is required"
   - UI: Red border on input, error message below

2. **Minimum Length:**
   - Condition: `name.trim().length < 1`
   - Error: "Deck name must be at least 1 character"
   - UI: Red border on input, error message below

3. **Maximum Length:**
   - Condition: `name.length > 100` (check DB schema for exact limit)
   - Error: "Deck name is too long (max 100 characters)"
   - UI: Character counter, red border when exceeded

4. **Whitespace Only:**
   - Condition: `name.trim().length === 0` but `name.length > 0`
   - Error: "Deck name cannot be only whitespace"
   - UI: Red border on input, error message below

**Types:**
- `CreateDeckCommand` (from src/types.ts)
- `CreateDeckFormState` (ViewModel)
- `ApiError` (from src/types.ts)

**Props:**
```typescript
interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (command: CreateDeckCommand) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}
```

**State:**
```typescript
interface CreateDeckFormState {
  name: string;
  validationError: string | null;
  isValid: boolean;
}
```

**Implementation Notes:**
- Use shadcn/ui Dialog component
- Import validation schema from `@/lib/validators/deck.validator`
- Reuse backend Zod schema for consistency
- Clear form on successful submission
- Keep form data on error for retry
- Auto-focus input on modal open

### 4.8. EmptyState

**Description:** Displayed when user has no decks. Encourages first deck creation with clear call-to-action. Friendly, welcoming design to reduce friction for new users.

**Main Elements:**
- Empty state illustration/icon
- Heading: "No Decks Yet"
- Description text: "Create your first deck to start learning"
- Primary CTA button: "Create Your First Deck"
- Responsive layout

**Handled Interactions:**
- CTA button click: Opens CreateDeckModal

**Validation:** None

**Types:** None

**Props:**
```typescript
interface EmptyStateProps {
  onCreateClick: () => void;
}
```

### 4.9. LoadingState

**Description:** Displayed during initial data fetch or refetch operations. Uses skeleton loaders matching the layout of DeckGrid for perceived performance.

**Main Elements:**
- Skeleton grid matching DeckGrid layout
- Multiple skeleton cards (4-6 instances)
- Pulsing animation
- Responsive layout

**Handled Interactions:** None

**Validation:** None

**Types:** None

**Props:** None

**Implementation Notes:**
- Use shadcn/ui Skeleton component
- Match DeckGrid responsive breakpoints
- Animate with CSS pulse

### 4.10. ErrorState

**Description:** Displayed when initial data fetch fails. Provides clear error message and retry mechanism.

**Main Elements:**
- Error icon (red)
- Error heading: "Failed to Load Decks"
- Error message (from API or generic)
- Retry button
- Responsive layout

**Handled Interactions:**
- Retry button click: Refetches decks from API

**Validation:** None

**Types:**
- `ApiError` (from src/types.ts)

**Props:**
```typescript
interface ErrorStateProps {
  error: ApiError | null;
  onRetry: () => void;
}
```

### 4.11. NoResultsState

**Description:** Displayed when search query returns no matching decks. Helps user understand why they see no results and provides action to clear search.

**Main Elements:**
- Search icon (gray)
- Heading: "No Decks Found"
- Description: "No decks match '{searchQuery}'"
- Clear search button
- Responsive layout

**Handled Interactions:**
- Clear search button: Resets search query to empty string

**Validation:** None

**Types:** None

**Props:**
```typescript
interface NoResultsStateProps {
  searchQuery: string;
  onClearSearch: () => void;
}
```

## 5. Types

### 5.1. Existing Types (from src/types.ts)

```typescript
// Already defined in codebase
export type DeckDTO = DeckEntity & {
  card_count: number;
};

export type ListDecksResponseDTO = DeckDTO[];

export type CreateDeckCommand = Pick<TablesInsert<"decks">, "name">;

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, string[]>;
}
```

### 5.2. New ViewModel Types (to be added to src/types.ts)

```typescript
/**
 * DecksLibraryViewState - Complete state for Deck Library view
 * Used in: useDecksLibrary custom hook
 *
 * Manages the entire deck library workflow including:
 * - Deck listing and filtering
 * - Search functionality
 * - Deck creation modal state
 * - Loading and error states
 */
export interface DecksLibraryViewState {
  // Data state
  decks: DeckDTO[];
  filteredDecks: DeckDTO[];
  
  // Search state
  searchQuery: string;
  
  // Loading/error states
  isLoading: boolean;
  error: ApiError | null;
  
  // Modal state
  showCreateModal: boolean;
  isCreating: boolean;
  createError: string | null;
}

/**
 * CreateDeckFormState - State for create deck modal form
 * Used in: CreateDeckModal component
 *
 * Tracks form input, validation, and submission state
 */
export interface CreateDeckFormState {
  name: string;
  validationError: string | null;
  isValid: boolean;
}

/**
 * DeckFilterOptions - Options for filtering decks
 * Used in: Search and filter logic
 */
export interface DeckFilterOptions {
  query: string;
  sortBy: 'name' | 'created_at' | 'card_count';
  sortDirection: 'asc' | 'desc';
}
```

## 6. State Management

### 6.1. State Architecture

The Deck Library view uses a **custom hook pattern** for state management, combining React's built-in hooks (useState, useEffect, useMemo) with custom business logic encapsulation.

**Why Custom Hook?**
- Centralizes complex state logic and side effects
- Makes the main component cleaner and more readable
- Provides better testability
- Enables reusability if needed in other contexts
- Separates concerns between UI and business logic

### 6.2. Custom Hook: useDecksLibrary

**Location:** `src/components/decks/hooks/useDecksLibrary.ts`

**Purpose:** Manages all state and operations for the Deck Library view, including data fetching, search filtering, deck creation, and error handling.

**Hook Signature:**
```typescript
interface UseDecksLibraryParams {
  initialDecks: DeckDTO[];
  initialError?: ApiError | null;
}

interface UseDecksLibraryReturn {
  // State
  state: DecksLibraryViewState;
  
  // Data operations
  fetchDecks: () => Promise<void>;
  createDeck: (command: CreateDeckCommand) => Promise<DeckDTO | null>;
  
  // UI operations
  handleSearch: (query: string) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  retryFetch: () => Promise<void>;
}

function useDecksLibrary(params: UseDecksLibraryParams): UseDecksLibraryReturn
```

**Internal State Variables:**
```typescript
const [decks, setDecks] = useState<DeckDTO[]>(initialDecks);
const [searchQuery, setSearchQuery] = useState<string>("");
const [isLoading, setIsLoading] = useState<boolean>(false);
const [error, setError] = useState<ApiError | null>(initialError || null);
const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
const [isCreating, setIsCreating] = useState<boolean>(false);
const [createError, setCreateError] = useState<string | null>(null);
```

**Computed Values (useMemo):**
```typescript
// Alphabetically sorted decks
const sortedDecks = useMemo(() => {
  return [...decks].sort((a, b) => 
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );
}, [decks]);

// Filtered decks based on search query
const filteredDecks = useMemo(() => {
  if (!searchQuery.trim()) return sortedDecks;
  
  const query = searchQuery.toLowerCase();
  return sortedDecks.filter(deck =>
    deck.name.toLowerCase().includes(query)
  );
}, [sortedDecks, searchQuery]);
```

**Key Functions:**

1. **fetchDecks:**
```typescript
const fetchDecks = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    const response = await fetch('/api/decks');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch decks');
    }
    
    const data: ListDecksResponseDTO = await response.json();
    setDecks(data);
  } catch (err) {
    setError({
      error: 'Fetch Error',
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  } finally {
    setIsLoading(false);
  }
};
```

2. **createDeck:**
```typescript
const createDeck = async (command: CreateDeckCommand): Promise<DeckDTO | null> => {
  setIsCreating(true);
  setCreateError(null);
  
  try {
    const response = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create deck');
    }
    
    const newDeck: DeckDTO = await response.json();
    
    // Optimistic update
    setDecks(prev => [...prev, newDeck]);
    setShowCreateModal(false);
    
    return newDeck;
  } catch (err) {
    setCreateError(err instanceof Error ? err.message : 'Unknown error occurred');
    return null;
  } finally {
    setIsCreating(false);
  }
};
```

3. **handleSearch:**
```typescript
const handleSearch = (query: string) => {
  setSearchQuery(query);
};
```

4. **Modal Controls:**
```typescript
const openCreateModal = () => {
  setShowCreateModal(true);
  setCreateError(null);
};

const closeCreateModal = () => {
  setShowCreateModal(false);
  setCreateError(null);
};
```

### 6.3. Component State

Individual components maintain minimal local state:

- **CreateDeckModal:** Form input state, local validation state
- **SearchFilter:** Debounced input value (derived from parent state)
- **DeckCard:** Hover/focus states (CSS only)

## 7. API Integration

### 7.1. List Decks Endpoint

**Endpoint:** GET `/api/decks`

**Request:**
- Method: `GET`
- Headers: `Authorization: Bearer <token>` (added by middleware)
- Body: None

**Response (Success 200):**
```typescript
// Type: ListDecksResponseDTO
[
  {
    "id": "deck-uuid",
    "user_id": "user-uuid",
    "name": "History 101",
    "card_count": 25,
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-01-15T10:00:00Z"
  },
  // ... more decks
]
```

**Response (Error 500):**
```typescript
// Type: ApiError
{
  "error": "Internal Server Error",
  "message": "Failed to fetch decks"
}
```

**Frontend Usage:**
- Called in `useDecksLibrary.fetchDecks()`
- Also called server-side in `DecksPage.astro` for SSR
- Results are cached in component state
- Refetch triggered by user action (retry button)

### 7.2. Create Deck Endpoint

**Endpoint:** POST `/api/decks`

**Request:**
- Method: `POST`
- Headers: 
  - `Authorization: Bearer <token>` (added by middleware)
  - `Content-Type: application/json`
- Body:
```typescript
// Type: CreateDeckCommand
{
  "name": "History 101"
}
```

**Response (Success 201):**
```typescript
// Type: DeckDTO
{
  "id": "deck-uuid",
  "user_id": "user-uuid",
  "name": "History 101",
  "card_count": 0,
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-15T10:00:00Z"
}
```

**Response (Error 400 - Validation):**
```typescript
// Type: ApiError
{
  "error": "Validation Error",
  "message": "Deck name is required",
  "details": [
    {
      "field": "name",
      "message": "Deck name is required"
    }
  ]
}
```

**Response (Error 500):**
```typescript
// Type: ApiError
{
  "error": "Internal Server Error",
  "message": "Failed to create deck"
}
```

**Frontend Usage:**
- Called in `useDecksLibrary.createDeck()`
- Triggered by CreateDeckModal form submission
- On success: Add deck to state, close modal, navigate to deck details
- On error: Display error in modal, keep modal open, preserve input

## 8. User Interactions

### 8.1. View Decks (Primary Flow)

**User Action:** Navigate to `/app/decks`

**System Response:**
1. Astro SSR fetches decks from API
2. Page renders with initial data
3. DecksLibrary component hydrates with initial decks
4. Decks display in alphabetical grid
5. If decks exist, search filter is visible
6. CreateDeckButton is always visible

**Edge Cases:**
- No decks: Show EmptyState
- Fetch error: Show ErrorState with retry
- Loading: Show LoadingState (skeleton)

### 8.2. Search Decks

**User Action:** Type in search input

**System Response:**
1. Input value updates on each keystroke (controlled)
2. Debounced search query updates after 300ms
3. `filteredDecks` recomputes via useMemo
4. DeckGrid re-renders with filtered results
5. If no results, show NoResultsState
6. Clear button appears when query is not empty

**Edge Cases:**
- Empty query: Show all decks
- No matches: Show NoResultsState
- Special characters: Handle gracefully (no errors)

### 8.3. Create Deck (Primary Flow)

**User Action:** Click "New Deck" button

**System Response:**
1. `openCreateModal()` called
2. CreateDeckModal renders with open state
3. Input auto-focuses
4. User types deck name
5. Real-time validation feedback
6. User clicks "Create" button
7. `createDeck()` called with form data
8. API request sent
9. Loading state shown (disabled buttons)
10. On success:
    - Modal closes
    - Toast notification: "Deck created!"
    - Navigate to `/app/decks/[new-id]`
11. On error:
    - Error message shown in modal
    - Input preserved
    - User can retry

**Edge Cases:**
- Empty name: Validation error, submit disabled
- Too long name: Character counter, validation error
- Network error: Show error, enable retry
- Duplicate name: Server handles, shows error if needed

### 8.4. Navigate to Deck

**User Action:** Click on a deck card

**System Response:**
1. Navigate to `/app/decks/[id]` using Astro navigation
2. Page transition animation (if configured)
3. Deck details view loads

### 8.5. Clear Search

**User Action:** Click clear button in search input

**System Response:**
1. Search query resets to empty string
2. `filteredDecks` updates to show all decks
3. Clear button disappears
4. DeckGrid shows all decks alphabetically

### 8.6. Retry After Error

**User Action:** Click "Retry" button in ErrorState

**System Response:**
1. `retryFetch()` called
2. Error state clears
3. Loading state shows
4. API request sent
5. On success: Show decks
6. On failure: Show error again

### 8.7. Close Modal

**User Actions:** 
- Click "Cancel" button
- Click X close button
- Press Escape key
- Click outside modal (backdrop)

**System Response:**
1. `closeCreateModal()` called
2. Modal closes with animation
3. Form state resets
4. Error messages clear

## 9. Conditions and Validation

### 9.1. Display Conditions

**Condition Tree:**
```typescript
if (isLoading) {
  return <LoadingState />;
}

if (error) {
  return <ErrorState error={error} onRetry={retryFetch} />;
}

if (decks.length === 0) {
  return <EmptyState onCreateClick={openCreateModal} />;
}

// Has decks - show main content
return (
  <>
    <SearchFilter value={searchQuery} onChange={handleSearch} />
    {filteredDecks.length === 0 && searchQuery !== "" ? (
      <NoResultsState searchQuery={searchQuery} onClearSearch={() => handleSearch("")} />
    ) : (
      <DeckGrid decks={filteredDecks} />
    )}
  </>
);
```

### 9.2. CreateDeckButton Conditions

**Visibility:** Always visible

**Disabled State:** 
- `isCreating === true` (during deck creation)
- Optional: When quota limit reached (future enhancement)

### 9.3. SearchFilter Conditions

**Visibility:** 
- Hidden: `decks.length === 0`
- Visible: `decks.length > 0`

**Clear Button Visibility:**
- Hidden: `searchQuery === ""`
- Visible: `searchQuery !== ""`

### 9.4. CreateDeckModal Validation

**Client-Side Validation Rules:**

1. **Required Field:**
   ```typescript
   const isEmpty = name.trim().length === 0;
   if (isEmpty) {
     return { isValid: false, error: "Deck name is required" };
   }
   ```

2. **Minimum Length:**
   ```typescript
   const isTooShort = name.trim().length < 1;
   if (isTooShort) {
     return { isValid: false, error: "Deck name must be at least 1 character" };
   }
   ```

3. **Maximum Length:**
   ```typescript
   const maxLength = 100; // Match DB constraint
   const isTooLong = name.length > maxLength;
   if (isTooLong) {
     return { isValid: false, error: `Deck name is too long (max ${maxLength} characters)` };
   }
   ```

4. **Whitespace Only:**
   ```typescript
   const isWhitespaceOnly = name.length > 0 && name.trim().length === 0;
   if (isWhitespaceOnly) {
     return { isValid: false, error: "Deck name cannot be only whitespace" };
   }
   ```

**Validation Timing:**
- On input change (real-time feedback)
- On blur (show errors after user leaves field)
- On submit (final validation before API call)

**Submit Button State:**
```typescript
const isSubmitDisabled = !isValid || isCreating || name.trim().length === 0;
```

**Implementation:**
```typescript
// Use Zod schema from validators
import { createDeckSchema } from '@/lib/validators/deck.validator';

function validateDeckName(name: string): { isValid: boolean; error: string | null } {
  const result = createDeckSchema.safeParse({ name });
  
  if (result.success) {
    return { isValid: true, error: null };
  }
  
  const firstError = result.error.errors[0];
  return { isValid: false, error: firstError.message };
}
```

### 9.5. API Error Handling Conditions

**Network Errors:**
```typescript
if (error.message.includes('fetch') || error.message.includes('network')) {
  return "Unable to connect. Check your internet connection and try again.";
}
```

**Server Errors (5xx):**
```typescript
if (response.status >= 500) {
  return "Server error occurred. Please try again later.";
}
```

**Validation Errors (400):**
```typescript
if (response.status === 400 && errorData.details) {
  return errorData.details.map(d => d.message).join(', ');
}
```

**Authentication Errors (401/403):**
```typescript
if (response.status === 401 || response.status === 403) {
  // Redirect to login
  window.location.href = '/login';
  return;
}
```

## 10. Error Handling

### 10.1. Error Categories

#### Category 1: Initial Load Errors

**Scenarios:**
- Network failure during SSR
- API server down
- Database connection issues
- Unauthorized access (auth expired)

**Handling:**
- SSR Error: Show Astro error page with message
- Client Error: Show ErrorState component
- Provide "Retry" button to refetch
- Log error to console with context

**User Experience:**
- Clear error message: "Failed to Load Decks"
- Actionable retry button
- No data loss (no form state to lose)

#### Category 2: Create Deck Errors

**Scenarios:**
- Validation errors (empty name, too long)
- Network errors during API call
- Server errors (500)
- Duplicate name (if enforced by DB)

**Handling:**
- Show error in modal (don't close)
- Preserve user input for retry
- Provide specific error message
- Disable submit during API call
- Show loading indicator

**User Experience:**
- Error message below input field
- Keep modal open with input intact
- Allow user to correct and retry
- Toast notification on success

#### Category 3: Search/Filter Errors

**Scenarios:**
- No results found for query
- Special characters in query
- Very long query string

**Handling:**
- Show NoResultsState (not an error state)
- Allow query continuation
- Provide clear search button
- No error logging (expected behavior)

**User Experience:**
- Friendly "No Decks Found" message
- Show current query in message
- Easy clear action
- No visual error indicators (red)

### 10.2. Error Recovery Strategies

#### Strategy 1: Automatic Retry

**When:**
- Network timeout (< 5 seconds)
- Temporary server errors (503)

**Implementation:**
```typescript
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok || i === retries - 1) {
        return response;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
  throw new Error('Max retries reached');
}
```

#### Strategy 2: Optimistic Updates

**When:**
- Creating new deck
- User expects immediate feedback

**Implementation:**
```typescript
const createDeck = async (command: CreateDeckCommand) => {
  // Optimistic update
  const tempDeck: DeckDTO = {
    id: `temp-${Date.now()}`,
    name: command.name,
    card_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'temp',
  };
  
  setDecks(prev => [...prev, tempDeck]);
  
  try {
    const newDeck = await createDeckAPI(command);
    // Replace temp with real deck
    setDecks(prev => prev.map(d => d.id === tempDeck.id ? newDeck : d));
    return newDeck;
  } catch (error) {
    // Rollback on error
    setDecks(prev => prev.filter(d => d.id !== tempDeck.id));
    throw error;
  }
};
```

#### Strategy 3: Graceful Degradation

**When:**
- Non-critical features fail
- Partial data available

**Examples:**
- If card_count fails to load, show "—" instead
- If search fails, fall back to showing all decks
- If sort fails, show unsorted list

### 10.3. Error Logging

**Development:**
```typescript
console.error('[DecksLibrary] Fetch failed:', {
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
  userId: user?.id,
});
```

### 10.4. Error Messages

**User-Facing Messages (English):**

| Error Type | Message | Action |
|------------|---------|--------|
| Network Error | "Unable to connect. Check your internet connection and try again." | Retry |
| Server Error (500) | "Something went wrong on our end. Please try again later." | Retry |
| Validation Error | "Deck name is required" | Fix input |
| Unauthorized (401) | "Your session has expired. Please log in again." | Redirect |
| Not Found (404) | "Deck not found. It may have been deleted." | Go back |
| Rate Limit (429) | "Too many requests. Please wait a moment and try again." | Wait |
| Unknown Error | "An unexpected error occurred. Please try again." | Retry |

## 11. Implementation Steps

### Step 1: Project Setup and Structure

1. Create directory structure:
   ```
   src/components/decks/
   ├── DecksLibrary.tsx
   ├── DeckGrid.tsx
   ├── DeckCard.tsx
   ├── SearchFilter.tsx
   ├── CreateDeckButton.tsx
   ├── CreateDeckModal.tsx
   ├── EmptyState.tsx
   ├── LoadingState.tsx
   ├── ErrorState.tsx
   ├── NoResultsState.tsx
   └── hooks/
       └── useDecksLibrary.ts
   
   src/pages/app/
   └── decks.astro
   
   src/lib/api/
   └── decks.api.ts
   ```

2. Add new types to `src/types.ts`:
   - `DecksLibraryViewState`
   - `CreateDeckFormState`
   - `DeckFilterOptions`

### Step 2: Create Astro Page Component

1. Create `src/pages/app/decks.astro`
2. Implement SSR data fetching:
   ```typescript
   const response = await fetch(`${Astro.url.origin}/api/decks`);
   const initialDecks = response.ok ? await response.json() : [];
   const initialError = !response.ok ? { message: 'Failed to load' } : null;
   ```
3. Set up page layout and metadata
4. Add DecksLibrary component with `client:load`
5. Pass initial data as props

### Step 3: Implement Custom Hook (useDecksLibrary)

1. Create `src/components/decks/hooks/useDecksLibrary.ts`
2. Implement state variables (useState)
3. Implement computed values (useMemo for filtering/sorting)
4. Implement `fetchDecks()` function
5. Implement `createDeck()` function
6. Implement `handleSearch()` function
7. Implement modal control functions
8. Implement error handling
9. Add TypeScript types for hook params and return value

### Step 4: Build Presentation Components (Bottom-Up)

**4a. Create DeckCard Component**
1. Create `src/components/decks/DeckCard.tsx`
2. Implement props interface
3. Build card layout with Tailwind classes
4. Add deck name and card count display
5. Implement click handler for navigation
6. Add hover/focus states
7. Test with mock data

**4b. Create DeckGrid Component**
1. Create `src/components/decks/DeckGrid.tsx`
2. Implement props interface
3. Build responsive grid layout
4. Map over decks to render DeckCard components
5. Add empty check (defensive)
6. Test responsive breakpoints

**4c. Create SearchFilter Component**
1. Create `src/components/decks/SearchFilter.tsx`
2. Implement props interface
3. Build input with search icon
4. Add clear button (conditional)
5. Implement debouncing logic
6. Add accessibility attributes
7. Test search functionality

**4d. Create State Components**
1. Create `EmptyState.tsx` - empty deck list state
2. Create `LoadingState.tsx` - skeleton loader
3. Create `ErrorState.tsx` - error display with retry
4. Create `NoResultsState.tsx` - no search results
5. Test each state independently

### Step 5: Build Modal Components

**5a. Create CreateDeckModal**
1. Create `src/components/decks/CreateDeckModal.tsx`
2. Use shadcn/ui Dialog component as base
3. Implement props interface
4. Build modal structure (overlay, container, header)
5. Add close handlers (X button, Escape, backdrop click)
6. Create form with name input
7. Import and use validation schema from validators
8. Implement real-time validation feedback
9. Add submit/cancel buttons
10. Implement loading state during creation
11. Add error message display
12. Test modal open/close animations
13. Test form submission
14. Test validation rules
15. Test error scenarios

**5b. Create CreateDeckButton**
1. Create `src/components/decks/CreateDeckButton.tsx`
2. Implement props interface
3. Build responsive button (FAB mobile, inline desktop)
4. Add icon and text
5. Test click handler

### Step 6: Implement Main Container Component (DecksLibrary)

1. Create `src/components/decks/DecksLibrary.tsx`
2. Implement props interface
3. Import and use `useDecksLibrary` hook
4. Set up conditional rendering logic:
   - Loading state
   - Error state
   - Empty state
   - Content (with search + grid)
   - No results state
5. Wire up all child components with props
6. Implement modal open/close handlers
7. Implement deck creation handler with navigation
8. Add toast notifications (success/error)
9. Test all user flows
10. Test error scenarios

### Step 7: Styling and Responsive Design

1. Review all components for Tailwind class consistency
2. Implement responsive breakpoints:
   - Mobile: < 768px (1 column)
   - Tablet: 768px - 1024px (2 columns)
   - Desktop: > 1024px (3 columns)
3. Test FAB positioning on mobile
4. Test modal responsiveness
5. Test navigation bar spacing
6. Verify green primary color usage
7. Test typography scaling
8. Add hover/focus states
9. Verify accessibility (keyboard navigation, ARIA labels)

### Step 8: Testing and Validation

**Manual Testing:**
   - Test on mobile device (responsive)
   - Test with empty state
   - Test with many decks (50+)
   - Test search with various queries
   - Test network errors (disconnect)
   - Test validation errors
   - Test accessibility (keyboard only)
   - Test screen reader compatibility

### Step 9: Error Handling and Edge Cases

1. Add comprehensive error boundaries
2. Implement retry logic with exponential backoff
3. Add optimistic updates for deck creation
4. Handle race conditions in API calls
5. Add defensive checks for undefined/null
6. Verify error messages are user-friendly

### Step 10: Performance Optimization

1. Add React.memo to pure components (DeckCard, DeckGrid)
2. Verify useMemo usage in useDecksLibrary
3. Implement debouncing for search (300ms)
4. Add skeleton loaders for perceived performance
5. Optimize bundle size (check imports)

### Step 11: Accessibility Audit

1. Add ARIA labels to interactive elements
2. Implement keyboard navigation:
   - Tab through cards
   - Enter/Space to select
   - Escape to close modal
3. Add focus indicators
4. Verify color contrast ratios
5. Add loading announcements

### Step 12: Documentation

1. Add JSDoc comments to all components
2. Document prop interfaces with TSDoc
3. Add usage examples in comments
4. Document custom hook behavior
5. Create component README if needed
6. Update main project README with view info

### Step 13: Code Review and Cleanup

1. Review all code for consistency
2. Check TypeScript types are complete
3. Remove console.logs and debug code
4. Verify error handling is comprehensive
5. Check for code duplication (DRY)
6. Verify naming conventions
7. Format code with Prettier
8. Run ESLint and fix issues
9. Check for unused imports/variables

---

## Implementation Checklist

- [ ] Step 1: Project structure created
- [ ] Step 2: Astro page component implemented
- [ ] Step 3: Custom hook implemented
- [ ] Step 4: Presentation components built
- [ ] Step 5: Modal components built
- [ ] Step 6: Main container component implemented
- [ ] Step 7: Styling and responsive design complete
- [ ] Step 8: Testing complete
- [ ] Step 9: Error handling implemented
- [ ] Step 10: Performance optimized
- [ ] Step 11: Accessibility audit complete
- [ ] Step 12: Documentation complete
- [ ] Step 13: Code review complete

---

## Additional Notes

### Design Tokens

**Colors:**
- Primary (Green): `bg-green-600`, `hover:bg-green-700`, `text-green-600`
- Background: `bg-white`, `bg-slate-50`
- Text: `text-slate-900` (primary), `text-slate-600` (secondary)
- Border: `border-slate-200`, `hover:border-green-600`
- Error: `text-red-600`, `border-red-500`

**Typography:**
- Page Title: `text-3xl font-bold text-slate-900`
- Deck Name: `text-lg font-semibold text-slate-900`
- Card Count: `text-sm text-slate-600`
- Body Text: `text-base text-slate-700`

**Spacing:**
- Container Padding: `px-4 py-6` (mobile), `px-6 py-8` (desktop)
- Card Padding: `p-4` (mobile), `p-6` (desktop)
- Grid Gap: `gap-4` (mobile), `gap-6` (desktop)

**Breakpoints:**
- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

### Dependencies

**Required:**
- Astro 5
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui components: Dialog, Input, Button, Skeleton

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-17  
**Author:** Robert Zdanowski  
**Status:** Ready for Implementation