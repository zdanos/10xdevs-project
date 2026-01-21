# View Implementation Plan: Deck Details

## 1. Overview

The Deck Details view is a mobile-first management interface for a specific flashcard deck. It enables users to view, edit, and delete flashcards within a deck, rename or delete the deck itself, and navigate to study mode. The view combines server-side rendering for initial data with client-side React components for interactive features like card editing, optimistic updates, and two-step confirmations for destructive actions.

**Primary Goals:**
- Display deck metadata (name, card count) and all flashcards in the deck
- Enable manual flashcard creation via a Floating Action Button (FAB) on mobile or standard button on desktop
- Support inline editing and deletion of flashcards with proper validation and confirmation
- Allow deck renaming with optimistic UI updates
- Provide two-step confirmation for deck deletion with cascade warning
- Offer seamless navigation to study mode

**User Stories Covered:**
- US-007: Manual flashcard creation
- US-008: Deck and flashcard management (edit/delete)

## 2. View Routing

**Route:** `/app/decks/[id]`

**Route Parameters:**
- `id` (string): UUID of the deck to display

**Example URLs:**
- `/app/decks/550e8400-e29b-41d4-a716-446655440000`

**Access Control:**
- Protected route (requires authentication)
- User must own the deck (enforced via RLS policies)

**Navigation Sources:**
- Deck Library (`/app/decks`) - clicking on a deck card
- AI Generator (`/app/generate`) - after saving generated flashcards
- Dashboard - quick access to recent decks

## 3. Component Structure

```
DeckDetailsPage.astro (SSR)
├── Layout.astro (wrapper)
└── DeckDetailsView (React client:load)
    ├── DeckHeader (React)
    │   ├── Title display
    │   ├── Action menu (Rename, Delete, Study)
    │   └── RenameDialog (Shadcn Dialog)
    ├── FlashcardList (React)
    │   ├── FlashcardItem[] (React)
    │   │   ├── Card content display
    │   │   └── Action buttons (Edit, Delete)
    │   ├── EmptyState (when no flashcards)
    │   └── LoadingState (during fetch)
    ├── AddCardButton (React)
    │   ├── FAB (mobile: fixed bottom-right)
    │   └── Standard button (desktop: inline)
    ├── CardFormDrawer (shared component)
    │   ├── Mode: create | edit
    │   └── Form validation
    └── DeleteConfirmationDialog (Shadcn Dialog)
        ├── Type: deck | flashcard
        └── Danger actions
```

**Rendering Strategy:**
- **SSR (Astro):** Initial page load fetches deck and flashcards data server-side for fast FCP
- **Hydration (React):** Interactive components hydrated with `client:load` directive
- **Client-side updates:** All mutations (create, update, delete) handled client-side with optimistic updates

## 4. Component Details

### 4.1. DeckDetailsPage.astro (SSR Container)

**Description:**
Top-level Astro page component responsible for server-side data fetching and initial render. Fetches deck metadata and flashcards during SSR, handles errors, and passes data to the main React component.

**Main Elements:**
- Layout wrapper with page title
- DeckDetailsView component with hydration directive
- Error boundary for SSR failures

**Handled Events:** None (container component)

**Validation:** None (delegates to child components)

**Types Required:**
- `DeckDTO` - Deck metadata with card count
- `FlashcardDTO[]` - Array of flashcards
- `ApiError | null` - SSR error state

**Props:** N/A (top-level page)

**Implementation Notes:**
- Extract `id` param from `Astro.params`
- Validate UUID format before API calls
- Fetch deck and flashcards in parallel for optimal performance
- Handle 404 errors gracefully (redirect to `/app/decks` with error message)
- Pass initial data and error state to React component

---

### 4.2. DeckDetailsView (React Component)

**Description:**
Main client-side component that orchestrates all deck and flashcard operations. Manages state, API calls, and interactions between child components. Uses custom hook `useDeckDetails` for state management.

**Main Elements:**
- DeckHeader component (deck title and actions)
- FlashcardList component (scrollable card list)
- AddCardButton component (FAB/button)
- CardFormDrawer component (create/edit modal)
- DeleteConfirmationDialog component (danger actions)
- Toast notifications (success/error feedback)

**Handled Events:**
- Deck rename submission
- Deck deletion confirmation
- Flashcard creation/edit submission
- Flashcard deletion confirmation
- Navigation to study mode

**Validation:**
- Delegates validation to child components
- Manages global loading states to prevent concurrent mutations

**Types Required:**
- `DeckDetailsViewState` - Complete view state
- `DeckDTO` - Deck data
- `FlashcardDTO[]` - Flashcard list
- `ApiError | null` - Error states

**Props:**
```typescript
interface DeckDetailsViewProps {
  initialDeck: DeckDTO;
  initialFlashcards: FlashcardDTO[];
  initialError: ApiError | null;
  locale: string;
}
```

---

### 4.3. DeckHeader (React Component)

**Description:**
Displays deck title, card count summary, and action buttons. Provides access to rename/delete deck operations and study mode navigation. Implements optimistic UI updates for renaming.

**Main Elements:**
- `<h1>` - Deck title with edit icon button
- `<div>` - Card count display (e.g., "25 cards")
- `<Button>` - "Study Now" primary CTA (navigates to `/app/study/${deckId}`)
- `<DropdownMenu>` (Shadcn) - Secondary actions menu:
  - "Rename Deck" - opens RenameDialog
  - "Delete Deck" - opens DeleteConfirmationDialog
- `<RenameDialog>` - Modal for renaming
- `<DeleteConfirmationDialog>` - Two-step deck deletion

**Handled Events:**
- `onRename(newName: string)` - Submits deck rename with optimistic update
- `onDelete()` - Confirms and executes deck deletion
- `onStudy()` - Navigates to study view

**Validation:**
- **Rename validation:**
  - Name must not be empty (trim whitespace first)
  - Maximum 100 characters
  - Cannot be identical to current name (no-op)
- Real-time validation feedback in RenameDialog
- Disable submit button when validation fails

**Types Required:**
- `DeckDTO` - Current deck data
- `UpdateDeckCommand` - Rename payload: `{ name: string }`
- `ApiError | null` - Operation error state

**Props:**
```typescript
interface DeckHeaderProps {
  deck: DeckDTO;
  isRenaming: boolean;
  isDeletingDeck: boolean;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onStudy: () => void;
}
```

**Optimistic Update Strategy:**
1. User submits new name
2. Immediately update title in UI
3. API call in background
4. On error: revert to original name, show error toast
5. On success: keep updated name

---

### 4.4. FlashcardList (React Component)

**Description:**
Scrollable container displaying all flashcards in the deck. Handles empty state, loading state, and renders individual flashcard items. Manages list updates after create/edit/delete operations.

**Main Elements:**
- `<section>` - Scrollable container with responsive grid/list layout
- `<FlashcardItem[]>` - Array of flashcard components
- `<EmptyState>` - Displayed when deck has no flashcards
  - Icon, message ("No flashcards yet")
  - CTA button ("Create your first flashcard")
- `<LoadingState>` - Skeleton loaders during fetch

**Handled Events:**
- `onEditCard(card: FlashcardDTO)` - Opens CardFormDrawer in edit mode
- `onDeleteCard(id: string)` - Opens DeleteConfirmationDialog

**Validation:** None (display component)

**Types Required:**
- `FlashcardDTO[]` - Array of flashcards to display
- `boolean` - isLoading state

**Props:**
```typescript
interface FlashcardListProps {
  flashcards: FlashcardDTO[];
  isLoading: boolean;
  onEditCard: (card: FlashcardDTO) => void;
  onDeleteCard: (id: string) => void;
}
```

---

### 4.5. FlashcardItem (React Component)

**Description:**
Individual flashcard display component showing front/back content with action buttons. Provides visual hierarchy with truncated text and expand behavior.

**Main Elements:**
- `<article>` - Card container with border and shadow
- `<div>` - Front content section:
  - Label: "Front"
  - Content text (truncated after 3 lines on mobile, expandable)
- `<div>` - Back content section:
  - Label: "Back"
  - Content text (truncated after 3 lines on mobile, expandable)
- `<div>` - Action buttons:
  - `<Button>` (icon) - Edit (pencil icon)
  - `<Button>` (icon) - Delete (trash icon, danger color)

**Handled Events:**
- `onEdit()` - Triggers edit mode in CardFormDrawer
- `onDelete()` - Opens DeleteConfirmationDialog

**Validation:** None (display component)

**Types Required:**
- `FlashcardDTO` - Single flashcard data

**Props:**
```typescript
interface FlashcardItemProps {
  flashcard: FlashcardDTO;
  onEdit: () => void;
  onDelete: () => void;
}
```

**Accessibility:**
- Semantic HTML (`<article>`)
- ARIA labels for icon buttons
- Keyboard navigation support
- Focus visible states

---

### 4.6. AddCardButton (React Component)

**Description:**
Context-aware button that opens CardFormDrawer in create mode. Renders as a Floating Action Button (FAB) on mobile devices and a standard button on desktop.

**Main Elements:**
- **Mobile (< 768px):**
  - `<button>` - Fixed position bottom-right
  - Circular shape, large touch target (56x56px)
  - Plus (+) icon, shadow for elevation
  - `z-index: 40` to stay above content
- **Desktop (>= 768px):**
  - `<Button>` (Shadcn) - Standard inline button
  - Text: "Add Flashcard" with plus icon
  - Positioned in header or toolbar

**Handled Events:**
- `onClick()` - Opens CardFormDrawer with `mode="create"`

**Validation:** None

**Types Required:** None

**Props:**
```typescript
interface AddCardButtonProps {
  onClick: () => void;
  disabled?: boolean; // Disabled during save operations
}
```

**Styling Notes:**
- Mobile FAB: `fixed bottom-6 right-6`
- Ensure FAB doesn't overlap footer or important content
- Smooth scale animation on tap

---

### 4.7. CardFormDrawer (Shared Component)

**Description:**
Unified modal drawer for creating and editing flashcards. Slides up from bottom on mobile, appears as centered modal on desktop. Handles form state, validation, and submission. Already implemented in `src/components/ui/CardFormDrawer.tsx`.

**Main Elements:**
- `<div>` - Overlay (black 50% opacity)
- `<section>` - Drawer/modal container
- `<header>` - Title ("Create Flashcard" | "Edit Flashcard") and close button
- `<form>` - Card input form:
  - `<input>` - Front field (max 200 chars)
    - Label: "Front (Question)"
    - Character counter
    - Real-time validation feedback
  - `<textarea>` - Back field (max 500 chars, 6 rows)
    - Label: "Back (Answer)"
    - Character counter
    - Real-time validation feedback
- `<footer>` - Action buttons:
  - "Cancel" - closes drawer without saving
  - "Save Changes" - submits form (disabled when invalid)

**Handled Events:**
- `onSave(front: string, back: string)` - Submits validated card data
- `onCancel()` - Closes drawer, resets form state
- Escape key - closes drawer

**Validation:**
- **Front field:**
  - Required (after trim)
  - Maximum 200 characters
  - Error: "Front is required" | "Maximum 200 characters"
- **Back field:**
  - Required (after trim)
  - Maximum 500 characters
  - Error: "Back is required" | "Maximum 500 characters"
- Submit button disabled until both fields valid
- Real-time validation on input change

**Types Required:**
- `CardFormState` (internal) - Front, back, and errors
- Form data passed via props

**Props:**
```typescript
interface CardFormDrawerProps {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: {
    front: string;
    back: string;
  };
  onSave: (front: string, back: string) => void;
  onCancel: () => void;
}
```

**Behavior Notes:**
- Auto-focus on front input when opened
- Prevents body scroll when open
- Resets form state on close/submit
- Smooth slide-up animation (mobile) / fade-in (desktop)

---

### 4.8. DeleteConfirmationDialog (Shadcn Dialog)

**Description:**
Reusable two-step confirmation dialog for destructive actions (deck or flashcard deletion). Provides clear warning message and requires explicit confirmation to prevent accidental data loss.

**Main Elements:**
- `<Dialog>` (Shadcn) - Modal container
- `<DialogHeader>` - Warning icon and title
- `<DialogContent>`:
  - Danger message text (contextual based on type)
  - For deck deletion: "This will permanently delete X flashcards"
  - For flashcard deletion: "This action cannot be undone"
- `<DialogFooter>` - Action buttons:
  - "Cancel" - closes dialog, no action
  - "Delete" - danger button (red), executes deletion

**Handled Events:**
- `onConfirm()` - Executes delete operation
- `onCancel()` - Closes dialog without action

**Validation:** None (confirmation only)

**Types Required:**
- `DeleteConfirmationType` - "deck" | "flashcard"
- `string` - Item name/title for context

**Props:**
```typescript
interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  type: "deck" | "flashcard";
  itemName: string; // Deck name or flashcard preview
  itemCount?: number; // For deck: number of cards to be deleted
  isDeleting: boolean; // Loading state during API call
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Content Variants:**

**Deck Deletion:**
- Title: "Delete Deck?"
- Message: "Are you sure you want to delete '{deckName}'? This will permanently delete {cardCount} flashcard(s). This action cannot be undone."
- Button: "Delete Deck"

**Flashcard Deletion:**
- Title: "Delete Flashcard?"
- Message: "Are you sure you want to delete this flashcard? This action cannot be undone."
- Preview: First 50 chars of front text
- Button: "Delete Flashcard"

---

### 4.9. EmptyState (React Component)

**Description:**
Friendly empty state displayed when deck has no flashcards. Encourages user to create their first card via CTA button.

**Main Elements:**
- `<div>` - Centered container with icon and text
- `<svg>` - Empty state illustration (stack of cards icon)
- `<h3>` - "No flashcards yet"
- `<p>` - "Add your first flashcard to start learning"
- `<Button>` - "Create Flashcard" (calls AddCardButton functionality)

**Handled Events:**
- `onCreate()` - Opens CardFormDrawer in create mode

**Types Required:** None

**Props:**
```typescript
interface EmptyStateProps {
  onCreate: () => void;
}
```

---

### 4.10. LoadingState (React Component)

**Description:**
Skeleton loaders displayed during flashcard fetching. Provides visual feedback and reduces perceived loading time.

**Main Elements:**
- `<div>` - Container with multiple skeleton cards
- `<Skeleton>` (Shadcn) - Animated placeholder cards (3-5 items)
  - Mimics FlashcardItem layout
  - Pulsing animation

**Handled Events:** None (display component)

**Types Required:** None

**Props:** None

---

## 5. Types

### 5.1. Existing Types (from `src/types.ts`)

**DeckDTO:**
```typescript
type DeckDTO = DeckEntity & {
  card_count: number; // Computed field from API
};
```

**FlashcardDTO:**
```typescript
type FlashcardDTO = FlashcardEntity; // All fields from flashcards table
```

**CreateFlashcardCommand:**
```typescript
type CreateFlashcardCommand = Pick<
  TablesInsert<"flashcards">,
  "deck_id" | "front" | "back" | "creation_source" | "generation_id"
>;
```

**UpdateFlashcardCommand:**
```typescript
interface UpdateFlashcardCommand {
  front?: string;
  back?: string;
}
```

**UpdateDeckCommand:**
```typescript
type UpdateDeckCommand = Pick<TablesUpdate<"decks">, "name">;
```

**ApiError:**
```typescript
interface ApiError {
  error: string;
  message: string;
  details?: Record<string, string[]>;
  retry_after?: number;
}
```

### 5.2. New Types (to add to `src/types.ts`)

**DeckDetailsViewState:**
Complete state for Deck Details view, managed by custom hook.

```typescript
interface DeckDetailsViewState {
  // Core data
  deck: DeckDTO;
  flashcards: FlashcardDTO[];
  
  // Flashcard operations
  isLoadingFlashcards: boolean;
  flashcardsError: ApiError | null;
  
  // Deck rename operation
  isRenamingDeck: boolean;
  renameError: string | null;
  originalDeckName: string | null; // For optimistic rollback
  
  // Deck delete operation
  isDeletingDeck: boolean;
  deleteDeckError: string | null;
  showDeleteDeckDialog: boolean;
  
  // Card form state
  showCardForm: boolean;
  cardFormMode: "create" | "edit";
  editingCard: FlashcardDTO | null;
  isSavingCard: boolean;
  saveCardError: string | null;
  
  // Card delete operation
  isDeletingCard: boolean;
  deleteCardError: string | null;
  deletingCardId: string | null;
  showDeleteCardDialog: boolean;
}
```

**CardFormState:**
Internal state for CardFormDrawer validation.

```typescript
interface CardFormState {
  front: string;
  back: string;
  validationErrors: {
    front?: string;
    back?: string;
  };
}
```

**DeleteConfirmationState:**
State for delete confirmation dialog.

```typescript
interface DeleteConfirmationState {
  isOpen: boolean;
  type: "deck" | "flashcard";
  itemName: string;
  itemCount?: number; // For deck deletion
  itemId: string | null;
}
```

**DeckDetailsActions:**
Action interface returned by `useDeckDetails` hook.

```typescript
interface DeckDetailsActions {
  // Deck operations
  renameDeck: (name: string) => Promise<void>;
  deleteDeck: () => Promise<void>;
  openDeleteDeckDialog: () => void;
  closeDeleteDeckDialog: () => void;
  
  // Flashcard operations
  refreshFlashcards: () => Promise<void>;
  createCard: (front: string, back: string) => Promise<void>;
  updateCard: (id: string, data: UpdateFlashcardCommand) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  
  // UI state operations
  openCardForm: (mode: "create" | "edit", card?: FlashcardDTO) => void;
  closeCardForm: () => void;
  openDeleteCardDialog: (card: FlashcardDTO) => void;
  closeDeleteCardDialog: () => void;
  
  // Navigation
  navigateToStudy: () => void;
}
```

---

## 6. State Management

### 6.1. Custom Hook: `useDeckDetails`

**Purpose:**
Centralize all state management and business logic for the Deck Details view. Manages deck operations (rename, delete), flashcard operations (create, update, delete), UI state (modals, drawers), loading states, error handling, and optimistic updates.

**Location:** `src/components/deck-details/hooks/useDeckDetails.ts`

**Hook Signature:**
```typescript
function useDeckDetails(
  initialDeck: DeckDTO,
  initialFlashcards: FlashcardDTO[]
): {
  state: DeckDetailsViewState;
  actions: DeckDetailsActions;
}
```

### 6.2. State Variables

**Core Data:**
- `deck: DeckDTO` - Current deck metadata, updated after rename/delete
- `flashcards: FlashcardDTO[]` - Array of flashcards, updated after CRUD operations
- `originalDeckName: string | null` - Stored before rename for optimistic rollback

**Loading States:**
- `isLoadingFlashcards: boolean` - True during flashcard fetch operations
- `isRenamingDeck: boolean` - True during deck rename API call
- `isDeletingDeck: boolean` - True during deck delete API call
- `isSavingCard: boolean` - True during flashcard create/update API call
- `isDeletingCard: boolean` - True during flashcard delete API call

**Error States:**
- `flashcardsError: ApiError | null` - Error from flashcard fetch
- `renameError: string | null` - Error from deck rename
- `deleteDeckError: string | null` - Error from deck delete
- `saveCardError: string | null` - Error from flashcard create/update
- `deleteCardError: string | null` - Error from flashcard delete

**UI States:**
- `showCardForm: boolean` - Controls CardFormDrawer visibility
- `cardFormMode: "create" | "edit"` - Determines form behavior
- `editingCard: FlashcardDTO | null` - Card being edited (null for create)
- `showDeleteDeckDialog: boolean` - Controls deck delete confirmation
- `showDeleteCardDialog: boolean` - Controls flashcard delete confirmation
- `deletingCardId: string | null` - ID of card pending deletion

### 6.3. Key Operations

**Rename Deck (Optimistic):**
1. Store original name for rollback
2. Update deck name immediately in UI
3. Set `isRenamingDeck = true`
4. Call `PATCH /api/decks/${deckId}` with new name
5. On success: Clear original name, show success toast
6. On error: Revert to original name, show error toast
7. Set `isRenamingDeck = false`

**Delete Deck:**
1. Open confirmation dialog with card count warning
2. On confirm: Set `isDeletingDeck = true`
3. Call `DELETE /api/decks/${deckId}`
4. On success: Navigate to `/app/decks` with success toast
5. On error: Show error toast, close dialog
6. Set `isDeletingDeck = false`

**Create Flashcard:**
1. Open CardFormDrawer with `mode="create"`
2. On save: Validate front/back, set `isSavingCard = true`
3. Build `CreateFlashcardCommand`: `{ deck_id, front, back, creation_source: "Manual" }`
4. Call `POST /api/flashcards` with command
5. On success: Add card to `flashcards` array, close drawer, show success toast
6. On error: Show error in drawer (keep form data for retry)
7. Set `isSavingCard = false`

**Update Flashcard:**
1. Open CardFormDrawer with `mode="edit"`, prefill with card data
2. On save: Validate changes, set `isSavingCard = true`
3. Build `UpdateFlashcardCommand`: `{ front?, back? }`
4. Call `PATCH /api/flashcards/${cardId}` with changes
5. On success: Update card in `flashcards` array, close drawer, show success toast
6. On error: Show error in drawer
7. Set `isSavingCard = false`

**Delete Flashcard:**
1. Open confirmation dialog with card preview
2. On confirm: Set `isDeletingCard = true`
3. Call `DELETE /api/flashcards/${cardId}`
4. On success: Remove card from `flashcards` array, update deck card_count, show success toast
5. On error: Show error toast
6. Set `isDeletingCard = false`

**Refresh Flashcards:**
1. Set `isLoadingFlashcards = true`
2. Call `GET /api/flashcards?deck_id=${deckId}`
3. On success: Replace `flashcards` array with fresh data
4. On error: Set `flashcardsError`, show error state with retry button
5. Set `isLoadingFlashcards = false`

### 6.4. Error Handling Strategy

**Network Errors:**
- Display toast notification with retry option
- Keep form data intact for user to retry
- Log error to console for debugging

**Validation Errors (400):**
- Display field-specific errors in form
- Highlight invalid fields with red border
- Keep drawer/modal open for correction

**Not Found Errors (404):**
- Deck not found: Redirect to `/app/decks` with error toast
- Flashcard not found: Refresh flashcard list, show error toast

**Server Errors (500):**
- Display generic error toast: "Something went wrong. Please try again."
- Log full error details to console

**Optimistic Update Rollback:**
- Rename deck: Revert to `originalDeckName` on error
- Show error toast indicating operation failed

---

## 7. API Integration

### 7.1. Fetch Deck (SSR)

**Endpoint:** `GET /api/decks/${deckId}` (not implemented yet, may need to add)

**Alternative:** Fetch from decks list and filter by ID, or create dedicated endpoint

**Request:**
```typescript
const response = await fetch(`/api/decks/${deckId}`, {
  headers: {
    cookie: Astro.request.headers.get("cookie") || "",
  },
});
```

**Response (200):**
```typescript
DeckDTO
```

**Error Responses:**
- 404: Deck not found or access denied
- 500: Server error

**Implementation Note:** If endpoint doesn't exist, fetch from `/api/decks` and find by ID client-side, or create a new GET endpoint at `/api/decks/[id].ts` that returns a single deck.

---

### 7.2. List Flashcards (SSR + Client)

**Endpoint:** `GET /api/flashcards?deck_id={uuid}`

**Request:**
```typescript
// SSR (in Astro page)
const response = await fetch(
  `${Astro.url.origin}/api/flashcards?deck_id=${deckId}`,
  {
    headers: {
      cookie: Astro.request.headers.get("cookie") || "",
    },
  }
);

// Client-side (in hook)
const response = await fetch(`/api/flashcards?deck_id=${deckId}`);
```

**Response (200):**
```typescript
ListFlashcardsResponseDTO // FlashcardDTO[]
```

**Error Responses:**
- 400: Invalid deck_id format or missing parameter
- 500: Server error

**Usage:**
- SSR: Initial page load
- Client: After create/update/delete to refresh list

---

### 7.3. Rename Deck

**Endpoint:** `PATCH /api/decks/${deckId}`

**Request:**
```typescript
const response = await fetch(`/api/decks/${deckId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: newName } as UpdateDeckCommand),
});
```

**Request Body:**
```typescript
UpdateDeckCommand: { name: string }
```

**Response (200):**
```typescript
DeckDTO // Updated deck with new name and current card_count
```

**Error Responses:**
- 400: Validation error (empty name, too long)
- 404: Deck not found or access denied
- 500: Server error

**Optimistic Update:** Update UI immediately, rollback on error

---

### 7.4. Delete Deck

**Endpoint:** `DELETE /api/decks/${deckId}`

**Request:**
```typescript
const response = await fetch(`/api/decks/${deckId}`, {
  method: "DELETE",
});
```

**Response (204):** No content (success)

**Error Responses:**
- 400: Invalid deck ID format
- 404: Deck not found or access denied
- 500: Server error

**Post-deletion:** Navigate to `/app/decks` with success toast

**Note:** Cascading delete removes all flashcards in deck (ON DELETE CASCADE in DB schema)

---

### 7.5. Create Flashcard

**Endpoint:** `POST /api/flashcards`

**Request:**
```typescript
const response = await fetch("/api/flashcards", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    deck_id: deckId,
    front: frontText,
    back: backText,
    creation_source: "Manual",
  } as CreateFlashcardCommand),
});
```

**Request Body:**
```typescript
CreateFlashcardCommand: {
  deck_id: string;
  front: string;
  back: string;
  creation_source: "Manual" | "AI" | "EditedAI";
  generation_id?: string; // Optional, not used for manual creation
}
```

**Response (201):**
```typescript
FlashcardDTO // Newly created flashcard with ID and default SM-2 values
```

**Error Responses:**
- 400: Validation error (empty fields, too long, invalid creation_source)
- 404: Deck not found or access denied
- 500: Server error

**Post-creation:** Add card to local state, close drawer, show success toast

---

### 7.6. Update Flashcard

**Endpoint:** `PATCH /api/flashcards/${flashcardId}`

**Request:**
```typescript
const response = await fetch(`/api/flashcards/${flashcardId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    front: newFront,
    back: newBack,
  } as UpdateFlashcardCommand),
});
```

**Request Body:**
```typescript
UpdateFlashcardCommand: {
  front?: string;
  back?: string;
}
// At least one field must be provided
```

**Response (200):**
```typescript
FlashcardDTO // Updated flashcard with new content
```

**Error Responses:**
- 400: Validation error (empty fields, too long, no fields provided)
- 404: Flashcard not found or access denied
- 500: Server error

**Post-update:** Replace card in local state, close drawer, show success toast

---

### 7.7. Delete Flashcard

**Endpoint:** `DELETE /api/flashcards/${flashcardId}`

**Request:**
```typescript
const response = await fetch(`/api/flashcards/${flashcardId}`, {
  method: "DELETE",
});
```

**Response (204):** No content (success)

**Error Responses:**
- 400: Invalid flashcard ID format
- 404: Flashcard not found or access denied
- 500: Server error

**Post-deletion:** Remove card from local state, decrement deck card_count, show success toast

---

## 8. User Interactions

### 8.1. View Deck Details

**Trigger:** User navigates to `/app/decks/[id]` from deck library or other source

**Flow:**
1. Page loads with SSR data (deck and flashcards)
2. DeckHeader displays deck name and card count
3. FlashcardList displays all flashcards or empty state
4. AddCardButton (FAB on mobile) visible for quick card creation

**Expected Outcome:** User sees complete deck overview with all flashcards

---

### 8.2. Rename Deck

**Trigger:** User clicks edit icon next to deck title or selects "Rename" from actions menu

**Flow:**
1. RenameDialog opens with current deck name prefilled
2. User edits name in input field
3. Real-time validation feedback (empty check, max length)
4. User clicks "Save" button
5. Dialog closes immediately
6. Deck title updates in UI (optimistic)
7. API call executes in background
8. Success: Toast notification "Deck renamed successfully"
9. Error: Title reverts to original, error toast "Failed to rename deck. Please try again."

**Expected Outcome:** Deck name updated immediately with proper feedback

**Edge Cases:**
- User submits identical name: No-op, close dialog
- User submits empty/whitespace-only name: Validation error, submit disabled
- Network error: Rollback to original name, show retry option

---

### 8.3. Delete Deck

**Trigger:** User selects "Delete Deck" from actions menu

**Flow:**
1. DeleteConfirmationDialog opens
2. Dialog displays warning: "This will permanently delete {count} flashcard(s)"
3. User reads warning message
4. User clicks "Delete Deck" button (danger color)
5. Button shows loading state
6. API call to delete deck
7. Success: Navigate to `/app/decks` with toast "Deck deleted successfully"
8. Error: Close dialog, show error toast "Failed to delete deck. Please try again."

**Expected Outcome:** Deck and all flashcards permanently deleted, user redirected to deck library

**Edge Cases:**
- User clicks "Cancel": Dialog closes, no action
- Network error: Show error toast, keep user on page

---

### 8.4. Add New Flashcard

**Trigger:** User clicks FAB (mobile) or "Add Flashcard" button (desktop)

**Flow:**
1. CardFormDrawer slides up/fades in with empty form
2. Front input automatically focused
3. User types question in "Front" field
4. Real-time validation: character counter, max length warning
5. User types answer in "Back" field
6. Real-time validation: character counter, max length warning
7. User clicks "Save Changes" button (enabled only when valid)
8. Button shows loading state
9. API call to create flashcard
10. Success: Drawer closes, new card appears in list, toast "Flashcard created successfully"
11. Error: Drawer stays open, error message displayed, form data preserved for retry

**Expected Outcome:** New flashcard added to deck and immediately visible in list

**Edge Cases:**
- User clicks "Cancel": Drawer closes, form data discarded
- User presses Escape: Same as cancel
- Empty fields: Submit button disabled, validation errors shown
- Exceeds max length: Character counter turns red, validation error shown
- Network error: Form data preserved, user can retry

---

### 8.5. Edit Flashcard

**Trigger:** User clicks edit icon (pencil) on a flashcard item

**Flow:**
1. CardFormDrawer opens with flashcard data prefilled
2. Title shows "Edit Flashcard"
3. User modifies front and/or back content
4. Real-time validation on changes
5. User clicks "Save Changes" button
6. Button shows loading state
7. API call to update flashcard
8. Success: Drawer closes, updated card reflects changes, toast "Flashcard updated successfully"
9. Error: Drawer stays open, error message displayed, changes preserved

**Expected Outcome:** Flashcard content updated, changes immediately visible in list

**Edge Cases:**
- User makes no changes: Still allow save (no-op on backend)
- User clears a field: Validation error, submit disabled
- Network error: Changes preserved for retry

---

### 8.6. Delete Flashcard

**Trigger:** User clicks delete icon (trash) on a flashcard item

**Flow:**
1. DeleteConfirmationDialog opens
2. Dialog shows warning: "Are you sure you want to delete this flashcard?"
3. Dialog displays preview of front text (first 50 chars)
4. User clicks "Delete Flashcard" button (danger color)
5. Button shows loading state
6. API call to delete flashcard
7. Success: Dialog closes, card removed from list with fade-out animation, toast "Flashcard deleted successfully"
8. Error: Dialog closes, error toast "Failed to delete flashcard. Please try again."

**Expected Outcome:** Flashcard permanently removed from deck, card count updated

**Edge Cases:**
- User clicks "Cancel": Dialog closes, no action
- Last card in deck: After deletion, show empty state with CTA
- Network error: Card remains in list, show error toast

---

### 8.7. Navigate to Study Mode

**Trigger:** User clicks "Study Now" button in DeckHeader

**Flow:**
1. Validate deck has at least 1 flashcard
2. If empty: Show toast "Add flashcards before studying"
3. If valid: Navigate to `/app/study/${deckId}` (study view implementation out of scope)

**Expected Outcome:** User enters study session for this deck

---

### 8.8. Handle Empty Deck

**Trigger:** User views a deck with 0 flashcards

**Flow:**
1. FlashcardList renders EmptyState component
2. Empty state displays friendly message and icon
3. CTA button "Create Flashcard" prominently displayed
4. User clicks CTA
5. CardFormDrawer opens in create mode

**Expected Outcome:** User encouraged to add first flashcard

---

## 9. Conditions and Validation

### 9.1. Deck Name Validation (Rename Operation)

**Validated By:** RenameDialog component

**Conditions:**
1. **Required:** Name must not be empty after trimming whitespace
   - Error: "Deck name is required"
   - UI Impact: Submit button disabled
2. **Max Length:** Name must not exceed 100 characters
   - Error: "Maximum 100 characters"
   - UI Impact: Submit button disabled, character counter turns red
3. **No Change:** If name is identical to current name (after trim), treat as no-op
   - UI Impact: Close dialog without API call

**Validation Timing:**
- Real-time validation on input change
- Final validation before submit

**Error Display:**
- Inline error message below input field
- Red border on input when invalid
- Character counter shows `{current}/100` (red when exceeding)

---

### 9.2. Flashcard Front Validation (Create/Edit)

**Validated By:** CardFormDrawer component

**Conditions (enforced by API and component):**
1. **Required:** Front text must not be empty after trimming whitespace
   - Error: "Front is required"
   - UI Impact: Submit button disabled
2. **Max Length:** Front text must not exceed 200 characters
   - Error: "Maximum 200 characters"
   - UI Impact: Submit button disabled, character counter turns red
   - API Constraint: Database column max 200 chars

**Validation Timing:**
- Real-time validation on input change
- Final validation before submit

**Error Display:**
- Inline error message below input field (red text)
- Red border (border-red-500) on input when invalid
- Character counter shows `{current}/200` (red when exceeding)

---

### 9.3. Flashcard Back Validation (Create/Edit)

**Validated By:** CardFormDrawer component

**Conditions (enforced by API and component):**
1. **Required:** Back text must not be empty after trimming whitespace
   - Error: "Back is required"
   - UI Impact: Submit button disabled
2. **Max Length:** Back text must not exceed 500 characters
   - Error: "Maximum 500 characters"
   - UI Impact: Submit button disabled, character counter turns red
   - API Constraint: Database column max 500 chars

**Validation Timing:**
- Real-time validation on textarea change
- Final validation before submit

**Error Display:**
- Inline error message below textarea (red text)
- Red border (border-red-500) on textarea when invalid
- Character counter shows `{current}/500` (red when exceeding)

---

### 9.4. Deck ID Validation (API Routes)

**Validated By:** Astro API routes (already implemented)

**Conditions:**
1. **Format:** Must be a valid UUID v4 format
   - Error: "Invalid deck ID format"
   - HTTP Status: 400
2. **Existence:** Deck must exist in database
   - Error: "Deck not found or access denied"
   - HTTP Status: 404
3. **Ownership:** Deck must belong to authenticated user
   - Enforced by RLS policies
   - Error: "Deck not found or access denied"
   - HTTP Status: 404

**Component Impact:**
- 404 errors: Redirect user to `/app/decks` with error toast
- Never expose to user whether deck doesn't exist vs. access denied (security)

---

### 9.5. Flashcard ID Validation (API Routes)

**Validated By:** Astro API routes (already implemented)

**Conditions:**
1. **Format:** Must be a valid UUID v4 format
   - Error: "Invalid flashcard ID format"
   - HTTP Status: 400
2. **Existence:** Flashcard must exist in database
   - Error: "Flashcard not found or access denied"
   - HTTP Status: 404
3. **Ownership:** Flashcard's deck must belong to authenticated user
   - Enforced by RLS policies
   - Error: "Flashcard not found or access denied"
   - HTTP Status: 404

**Component Impact:**
- 404 errors: Refresh flashcard list, show error toast
- Remove flashcard from local state if confirmed deleted elsewhere

---

### 9.6. Creation Source Validation (Create Flashcard)

**Validated By:** API route (already implemented)

**Conditions:**
1. **Enum Value:** Must be one of: "Manual", "AI", "EditedAI"
   - For Deck Details view, always set to "Manual"
   - Error: "Invalid creation source"
   - HTTP Status: 400

**Component Impact:**
- Hardcode `creation_source: "Manual"` in CreateFlashcardCommand
- No user-facing validation needed

---

### 9.7. Study Mode Navigation Validation

**Validated By:** DeckHeader component

**Conditions:**
1. **Flashcard Count:** Deck must have at least 1 flashcard
   - UI Impact: Disable "Study Now" button when card_count === 0
   - Error Toast: "Add flashcards before studying"
2. **User Logged In:** Authentication required (enforced by middleware)

**Component Impact:**
- Disable study button and show tooltip when deck is empty
- Display encouraging message: "Add your first flashcard to start studying"

---

### 9.8. Concurrent Operations Prevention

**Validated By:** `useDeckDetails` hook

**Conditions:**
1. **Single Operation at a Time:** Disable all mutation actions while any operation is in progress
   - Rename deck: Disable delete, card operations
   - Delete deck: Disable all other operations
   - Save card: Disable other card operations, deck operations
   - Delete card: Disable other operations

**UI Impact:**
- Show loading spinners on active buttons
- Disable inactive buttons
- Prevent dialog/drawer from opening during operations

---

## 10. Error Handling

### 10.1. SSR Errors (Initial Page Load)

**Scenario:** API fails during server-side rendering

**Causes:**
- Network error to API
- Deck not found (invalid ID in URL)
- Database connection failure

**Handling Strategy:**
1. Catch error in Astro page component
2. Set `initialError` state with error details
3. Pass error to DeckDetailsView component
4. Display error state with retry button
5. Log error details to console

**User Experience:**
- Show error message: "Failed to load deck. Please try again."
- Display "Retry" button that refetches data client-side
- Optionally show "Back to Library" link

**Implementation:**
```typescript
// In DeckDetailsPage.astro
try {
  const deckResponse = await fetch(`/api/decks/${deckId}`);
  const flashcardsResponse = await fetch(`/api/flashcards?deck_id=${deckId}`);
  // ... handle responses
} catch (error) {
  initialError = {
    error: "SSR Error",
    message: "Failed to load deck",
  };
}
```

---

### 10.2. Deck Not Found (404)

**Scenario:** User navigates to non-existent or unauthorized deck

**Causes:**
- Invalid deck ID in URL
- Deck deleted by another session
- User doesn't own the deck (RLS policy blocks access)

**Handling Strategy:**
1. Detect 404 response from API
2. Redirect to `/app/decks` immediately
3. Show error toast: "Deck not found"
4. Don't expose whether deck doesn't exist vs. unauthorized (security)

**Implementation:**
```typescript
// In useDeckDetails hook
if (response.status === 404) {
  // Show toast
  toast.error("Deck not found");
  // Redirect
  window.location.href = "/app/decks";
}
```

---

### 10.3. Rename Deck Failure

**Scenario:** API call to rename deck fails

**Causes:**
- Network error
- Validation error (empty name, too long)
- Server error

**Handling Strategy:**
1. **Optimistic Update:** Name changed in UI immediately
2. **Rollback on Error:** Revert to `originalDeckName` stored before update
3. **Error Toast:** Show error message with retry option
4. **Preserve User Input:** If validation error, reopen dialog with user's input

**User Experience:**
- Optimistic: Title changes instantly
- Error: Title reverts, toast appears "Failed to rename deck. Please try again."
- Retry: Click toast action to reopen dialog

**Implementation:**
```typescript
const renameDeck = async (newName: string) => {
  const original = deck.name;
  setDeck({ ...deck, name: newName }); // Optimistic
  
  try {
    const response = await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: newName }),
    });
    
    if (!response.ok) throw new Error();
    
    toast.success("Deck renamed successfully");
  } catch (error) {
    setDeck({ ...deck, name: original }); // Rollback
    toast.error("Failed to rename deck. Please try again.");
  }
};
```

---

### 10.4. Delete Deck Failure

**Scenario:** API call to delete deck fails

**Causes:**
- Network error
- Deck not found (deleted elsewhere)
- Server error

**Handling Strategy:**
1. Show loading state in delete button
2. On error: Close confirmation dialog
3. Show error toast with retry option
4. Keep user on page (don't navigate away)
5. Log error details to console

**User Experience:**
- Button shows spinner during deletion
- Error toast: "Failed to delete deck. Please try again."
- User can retry by reopening delete dialog

---

### 10.5. Flashcard Creation Failure

**Scenario:** API call to create flashcard fails

**Causes:**
- Network error
- Validation error (empty fields, too long)
- Deck not found (deleted elsewhere)
- Server error

**Handling Strategy:**
1. Keep drawer open with form data intact
2. Display error message in drawer (above form or in toast)
3. Keep submit button enabled for retry
4. On 404 (deck deleted): Close drawer, redirect to `/app/decks`

**User Experience:**
- Validation errors: Field-specific messages, red borders
- Network errors: Toast "Failed to save flashcard. Please try again."
- Form data preserved: User can edit and retry without losing work

**Implementation:**
```typescript
const createCard = async (front: string, back: string) => {
  setIsSavingCard(true);
  
  try {
    const response = await fetch("/api/flashcards", {
      method: "POST",
      body: JSON.stringify({ deck_id: deck.id, front, back, creation_source: "Manual" }),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // Deck deleted elsewhere
        toast.error("Deck not found");
        window.location.href = "/app/decks";
        return;
      }
      throw new Error();
    }
    
    const newCard = await response.json();
    setFlashcards([...flashcards, newCard]);
    closeCardForm();
    toast.success("Flashcard created successfully");
  } catch (error) {
    setSaveCardError("Failed to save flashcard. Please try again.");
  } finally {
    setIsSavingCard(false);
  }
};
```

---

### 10.6. Flashcard Update Failure

**Scenario:** API call to update flashcard fails

**Causes:**
- Network error
- Validation error (empty fields, too long)
- Flashcard not found (deleted elsewhere)
- Server error

**Handling Strategy:**
1. Keep drawer open with edited data
2. Display error message
3. Allow user to retry or cancel
4. On 404: Close drawer, refresh flashcard list, show toast "Flashcard not found"

**User Experience:**
- Similar to creation failure
- Edited data preserved for retry
- 404: Assume card was deleted, remove from list

---

### 10.7. Flashcard Deletion Failure

**Scenario:** API call to delete flashcard fails

**Causes:**
- Network error
- Flashcard not found (already deleted)
- Server error

**Handling Strategy:**
1. Close confirmation dialog
2. Show error toast
3. Refresh flashcard list to sync state
4. On 404: Assume already deleted, remove from list silently

**User Experience:**
- Error toast: "Failed to delete flashcard. Please try again."
- If card actually deleted: List refreshes, card removed
- User can retry delete if it still exists

---

### 10.8. Network Errors (Offline/Timeout)

**Scenario:** User loses network connection or request times out

**Handling Strategy:**
1. Detect network error (fetch throws)
2. Show user-friendly message: "No internet connection. Please check your connection and try again."
3. Provide retry button/action
4. Preserve any form data for retry
5. Consider showing offline indicator in UI

**User Experience:**
- Generic network error toast
- Retry actions clearly available
- No data loss on transient failures

---

### 10.9. Validation Errors (400)

**Scenario:** API returns validation error response

**Causes:**
- Empty required fields (should be caught client-side)
- Exceeds max length (should be caught client-side)
- Invalid data format

**Handling Strategy:**
1. Parse error response to extract field-specific errors
2. Display errors next to relevant form fields
3. Keep form open for correction
4. If client-side validation missed it, log to console for debugging

**User Experience:**
- Field-specific error messages
- Red borders on invalid fields
- Submit button re-enabled after correction

---

### 10.10. Concurrent Deletion Handling

**Scenario:** Deck or flashcard deleted in another session/tab

**Handling Strategy:**
1. **Deck deleted:** 404 on any operation → Redirect to `/app/decks`
2. **Flashcard deleted:** 404 on update/delete → Refresh list, show toast
3. Periodically sync state (optional enhancement)

**User Experience:**
- Graceful handling of stale data
- Clear messaging: "Deck was deleted" vs. "Flashcard was deleted"
- Avoid confusing the user with technical errors

---

### 10.11. Server Errors (500)

**Scenario:** Backend server encounters an error

**Handling Strategy:**
1. Show generic error message (don't expose internal details)
2. Log full error to console for debugging
3. Provide retry option
4. Consider showing "Report Issue" link

**User Experience:**
- Toast: "Something went wrong. Please try again."
- If persists: Suggest refreshing page or contacting support

---

## 11. Implementation Steps

### Step 1: Create New Types

**File:** `src/types.ts`

**Tasks:**
1. Add `DeckDetailsViewState` interface with all state fields
2. Add `DeckDetailsActions` interface with all action methods
3. Add `CardFormState` interface for form validation
4. Add `DeleteConfirmationState` interface for dialog state
5. Export all new types

**Validation:** TypeScript compiles without errors

---

### Step 2: Create Custom Hook `useDeckDetails`

**File:** `src/components/deck-details/hooks/useDeckDetails.ts`

**Tasks:**
1. Set up state variables using `useState` for all fields in `DeckDetailsViewState`
2. Initialize with `initialDeck` and `initialFlashcards` props
3. Implement `renameDeck` with optimistic update and rollback
4. Implement `deleteDeck` with navigation on success
5. Implement `refreshFlashcards` for fetching updated list
6. Implement `createCard` with form data and API call
7. Implement `updateCard` with partial updates
8. Implement `deleteCard` with list update
9. Implement UI state handlers: `openCardForm`, `closeCardForm`, etc.
10. Return state and actions object

**Pattern:** Follow structure of `useDecksLibrary` hook

**Validation:**
- Hook compiles without errors
- All state updates immutable
- Error handling in all async operations

---

### Step 3: Create Deck Details View Component

**File:** `src/components/deck-details/DeckDetailsView.tsx`

**Tasks:**
1. Create functional component accepting `DeckDetailsViewProps`
2. Call `useDeckDetails` hook with initial data
3. Destructure state and actions from hook
4. Render component tree: DeckHeader, FlashcardList, AddCardButton, dialogs
5. Pass appropriate props to each child component
6. Handle toast notifications for success/error feedback
7. Add loading overlays during operations

**Pattern:** Follow structure of `DecksLibrary` component

**Validation:**
- Component renders without errors
- All child components receive correct props
- State flows correctly through component tree

---

### Step 4: Create DeckHeader Component

**File:** `src/components/deck-details/DeckHeader.tsx`

**Tasks:**
1. Create functional component accepting `DeckHeaderProps`
2. Render deck title, card count, and "Study Now" button
3. Implement actions dropdown menu with rename/delete options
4. Add RenameDialog with form validation
5. Add DeleteConfirmationDialog for deck deletion
6. Wire up event handlers to props
7. Implement loading states for buttons

**Styling:**
- Mobile-first responsive layout
- Green primary button for "Study Now"
- Danger styling for delete action

**Validation:**
- All interactions trigger correct prop callbacks
- Dialogs open/close correctly
- Loading states visible during operations

---

### Step 5: Create FlashcardList and FlashcardItem Components

**Files:**
- `src/components/deck-details/FlashcardList.tsx`
- `src/components/deck-details/FlashcardItem.tsx`

**Tasks (FlashcardList):**
1. Create component accepting `FlashcardListProps`
2. Render scrollable container with responsive layout
3. Map over `flashcards` array to render `FlashcardItem` components
4. Show `EmptyState` when `flashcards.length === 0`
5. Show `LoadingState` when `isLoading === true`
6. Pass `onEditCard` and `onDeleteCard` callbacks to items

**Tasks (FlashcardItem):**
1. Create component accepting `FlashcardItemProps`
2. Render card with front/back content sections
3. Implement text truncation with expand/collapse
4. Add edit and delete icon buttons
5. Wire up event handlers to props
6. Ensure keyboard accessibility

**Styling:**
- Card-like layout with border and shadow
- Hover states for interactivity
- Mobile-optimized touch targets

**Validation:**
- Cards render correctly with all data
- Action buttons trigger correct callbacks
- Empty/loading states display properly

---

### Step 6: Create AddCardButton Component

**File:** `src/components/deck-details/AddCardButton.tsx`

**Tasks:**
1. Create component accepting `AddCardButtonProps`
2. Implement responsive rendering:
   - Mobile (< 768px): FAB with fixed positioning
   - Desktop (>= 768px): Standard inline button
3. Add plus (+) icon with accessible label
4. Wire up `onClick` handler
5. Implement disabled state with visual feedback

**Styling:**
- FAB: `fixed bottom-6 right-6 z-40`
- Circular shape, 56x56px touch target
- Shadow for elevation
- Smooth scale animation on tap

**Validation:**
- Correct layout on different screen sizes
- Click triggers card form opening
- Disabled state prevents interaction

---

### Step 7: Verify CardFormDrawer Component

**File:** `src/components/ui/CardFormDrawer.tsx` (already exists)

**Tasks:**
1. Review existing implementation
2. Verify it matches required props interface
3. Test create and edit modes
4. Ensure validation works correctly
5. Make any necessary adjustments

**Validation:**
- Form opens with correct mode
- Validation prevents invalid submissions
- Save callback receives correct data
- Cancel closes drawer without saving

---

### Step 8: Create DeleteConfirmationDialog Component

**File:** `src/components/deck-details/DeleteConfirmationDialog.tsx`

**Tasks:**
1. Create component using Shadcn Dialog primitives
2. Accept `DeleteConfirmationDialogProps`
3. Render different content based on `type` (deck vs flashcard)
4. Display item name/preview and warning message
5. Show card count for deck deletion
6. Implement danger-styled delete button
7. Wire up confirm and cancel handlers
8. Show loading state during deletion

**Styling:**
- Red/danger color for delete button
- Warning icon (AlertTriangle from lucide-react)
- Clear, readable warning text

**Validation:**
- Correct content for each type
- Confirm triggers delete operation
- Cancel closes dialog without action
- Loading state prevents double-clicks

---

### Step 9: Create Empty and Loading State Components

**Files:**
- `src/components/deck-details/EmptyState.tsx`
- `src/components/deck-details/LoadingState.tsx`

**Tasks (EmptyState):**
1. Create component accepting `EmptyStateProps`
2. Render centered container with empty state icon
3. Add friendly message and CTA button
4. Wire up `onCreate` callback

**Tasks (LoadingState):**
1. Create component with no props
2. Render 3-5 skeleton cards using Shadcn Skeleton
3. Mimic FlashcardItem layout
4. Add pulsing animation

**Styling:**
- Centered layout for empty state
- Skeleton cards match real card dimensions

**Validation:**
- Empty state CTA opens card form
- Skeleton layout looks natural

---

### Step 10: Create Astro Page Component

**File:** `src/pages/app/decks/[id].astro`

**Tasks:**
1. Extract `id` parameter from `Astro.params`
2. Validate UUID format (basic check)
3. Fetch deck metadata (create GET endpoint if needed)
4. Fetch flashcards using `GET /api/flashcards?deck_id=${id}`
5. Handle SSR errors gracefully
6. Pass data to `DeckDetailsView` component
7. Set page title to deck name

**Error Handling:**
- 404: Redirect to `/app/decks` with error
- 500: Pass error to view component
- Network errors: Pass error to view component

**Validation:**
- Page renders with SSR data
- Error states handled correctly
- Component hydrates properly

---

### Step 11: Add GET Deck by ID Endpoint (Optional)

**File:** `src/pages/api/decks/[id].ts` (modify existing)

**Tasks:**
1. Add `GET` handler to existing file (currently has PATCH and DELETE)
2. Extract and validate deck ID
3. Fetch deck from database with card count
4. Return `DeckDTO` response
5. Handle errors (404, 500)

**Implementation:**
```typescript
export const GET: APIRoute = async ({ params }) => {
  const idValidation = deckIdSchema.safeParse(params.id);
  if (!idValidation.success) {
    return new Response(JSON.stringify({ error: "Invalid deck ID" }), { status: 400 });
  }
  
  const deck = await getDeck(supabaseClient, idValidation.data);
  return new Response(JSON.stringify(deck), { status: 200 });
};
```

**Alternative:** Fetch from `/api/decks` list and filter client-side in Astro page

**Validation:**
- Endpoint returns correct deck data
- 404 for non-existent or unauthorized decks

---

### Step 12: Add Navigation and Links

**Tasks:**
1. Update DecksLibrary to link to Deck Details on card click
2. Ensure "Study Now" button has correct link (when study view exists)
3. Add breadcrumb or back button to return to library

**Validation:**
- All links navigate correctly
- Browser back button works as expected
- Page state preserved on navigation

---

### Step 13: Implement Toast Notifications

**File:** Consider using a toast library or Shadcn Sonner

**Tasks:**
1. Install toast notification library (if not already present)
2. Add toast provider to Layout component
3. Implement toast calls in `useDeckDetails` hook
4. Style toasts consistently (success: green, error: red)
5. Position toasts appropriately (top-right desktop, bottom-center mobile)

**Validation:**
- Toasts appear for all success/error scenarios
- Toasts auto-dismiss after appropriate duration
- Multiple toasts queue correctly

---

### Step 14: Accessibility and Polish

**Tasks:**
1. Add ARIA labels to all icon buttons
2. Ensure keyboard navigation works throughout
3. Add focus-visible styles
4. Ensure focus trap in modals/dialogs
5. Check color contrast ratios
6. Ensure all interactive elements have min 44x44px touch targets

**Validation:**
- Passes WCAG 2.1 Level AA guidelines
- Keyboard-only navigation possible

---

### Step 15: Code Review

**Tasks:**
1. Review code for consistency with project patterns
2. Check TypeScript strict mode compliance
3. Run linters and fix any issues
4. Ensure no console warnings or errors

**Validation:**
- All user stories (US-007, US-008) fulfilled
- No regressions in other parts of the app
- Code follows project conventions

---

## Summary

This implementation plan provides a comprehensive guide for building the Deck Details view with full CRUD operations for decks and flashcards. The view follows mobile-first principles, implements optimistic UI updates for better UX, and includes proper validation and error handling throughout. By following these steps sequentially, a developer can implement a production-ready Deck Details view that integrates seamlessly with the existing FlashCard AI application.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-17  
**Author:** Robert Zdanowski  
**Status:** Ready for Implementation