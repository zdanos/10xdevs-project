# View Implementation Plan: AI Generator (Creation Flow)

## 1. Overview

The AI Generator view is the core feature of FlashCard AI MVP, enabling users to convert raw text into verified flashcards using AI (GPT-4o-mini). This view implements a three-phase workflow: **Input Phase** (paste notes), **Processing Phase** (AI generation), and **Staging Phase** (verify and edit cards). The view is implemented as a React Island using `client:load` strategy to enable complex client-side state management. Generated flashcards exist only in memory until the user explicitly saves them to a deck, fulfilling the user verification requirement.

**Key Features:**
- Text input with character limit (5000 max)
- Quota indicator showing daily generation limit (10/day)
- AI-powered flashcard generation
- Client-side staging area for card verification
- Edit, accept, and reject functionality for each card
- Bulk save to existing or new deck
- Mobile-first responsive design

## 2. View Routing

**Route:** `/app/generate`

**Rendering Strategy:** React Island with `client:load` directive

**File Structure:**
```
src/pages/app/generate.astro          # Astro wrapper page
src/components/generator/
  ├── GeneratorPage.tsx               # Main React component
  ├── QuotaIndicator.tsx              # Quota display component
  ├── SourceInput.tsx                 # Text input component
  ├── StagingArea.tsx                 # Staging area container
  ├── FlashcardPreviewCard.tsx        # Individual card preview
  ├── CardFormDrawer.tsx              # Edit modal (shared)
  ├── DeckSelectionModal.tsx          # Deck selection modal
  └── ActionToolbar.tsx               # Action buttons
```

## 3. Component Structure

### Component Hierarchy

```
GeneratorPage (Main Container)
├── QuotaIndicator (Display quota info)
├── SourceInput (Text input area)
├── ActionToolbar (Generate & Save buttons)
├── StagingArea (Container for staging cards)
│   ├── LoadingSkeleton (Shown during generation)
│   └── FlashcardPreviewCard[] (List of cards)
│       ├── FlashcardDisplay (Front/Back preview)
│       ├── EditButton
│       ├── AcceptButton
│       └── RejectButton
├── CardFormDrawer (Modal for editing)
│   ├── Input (Front field)
│   ├── Textarea (Back field)
│   └── Button (Save changes)
└── DeckSelectionModal (Deck selection UI)
    ├── DeckList (Existing decks)
    ├── Input (New deck name)
    └── Button (Confirm selection)
```

## 4. Component Details

### 4.1 GeneratorPage (Main Container)

**Description:** The root component that orchestrates the entire AI generation flow. Manages all state, handles API calls, and coordinates between child components. Implements the three-phase workflow: Input → Generation → Staging.

**Main Elements:**
- Container `<div>` with responsive layout (vertical stack on mobile, two-column on desktop)
- Header section with page title and quota indicator
- Main content area with input or staging display
- Action toolbar fixed at bottom (mobile) or inline (desktop)
- Modal overlays for editing and deck selection

**Child Components:**
- `QuotaIndicator` - Shows generations remaining
- `SourceInput` - Text input field
- `ActionToolbar` - Generate and Save buttons
- `StagingArea` - Displays generated cards
- `CardFormDrawer` - Edit modal
- `DeckSelectionModal` - Deck selection modal

**Handled Events:**
- `onTextChange`: Updates source text state
- `onGenerate`: Triggers AI generation API call
- `onEditCard`: Opens edit drawer for specific card
- `onSaveEdit`: Updates card in staging with edited values
- `onAcceptCard`: Marks card as accepted
- `onRejectCard`: Removes card from staging
- `onSaveToDecK`: Opens deck selection modal
- `onSelectDeck`: Saves all accepted cards to selected deck
- `onCreateDeck`: Creates new deck and saves cards

**Validation Conditions:**
1. **Generate Button Enable:**
   - Source text length >= 500 characters (per UI plan)
   - Source text length <= 5000 characters
   - Quota remaining > 0
   - Not currently generating

2. **Save Button Enable:**
   - At least one card with status 'accepted' or 'edited'
   - Not currently saving
   - All accepted cards have non-empty front and back

3. **Input Phase Validation:**
   - Display character count (current/5000)
   - Show error if text exceeds 5000 characters
   - Show warning if text < 500 characters

**Types:**
- `GeneratorViewState` (internal state)
- `GenerateFlashcardsResponseDTO` (API response)
- `ProfileDTO` (quota info)
- `DeckDTO[]` (deck list)

**Props:** None (root component)

---

### 4.2 QuotaIndicator

**Description:** Visual component displaying the user's remaining daily generation quota. Shows as a progress bar with numerical indicator. Updates after successful generation.

**Main Elements:**
- `<div>` container with flex layout
- Label: "Generations Left"
- Progress bar `<div>` with colored fill based on remaining quota
- Numerical display: "X/10"
- Tooltip/info icon explaining the 24h reset period

**Handled Events:** None (display only)

**Validation Conditions:** None

**Types:**
```typescript
interface QuotaIndicatorProps {
  remaining: number;  // 0-10
  max: number;        // Always 10
}
```

**Props:**
- `remaining: number` - Number of generations remaining (0-10)
- `max: number` - Maximum generations allowed (10)

---

### 4.3 SourceInput

**Description:** Text input area where users paste or type their source material. Includes character counter and validation feedback. Auto-expands on mobile for better UX.

**Main Elements:**
- `<section>` wrapper with border and padding
- `<textarea>` element with:
  - Placeholder: "Paste your notes here (minimum 500 characters)..."
  - Auto-resize based on content
  - Max height constraint (scroll beyond)
- Character counter `<span>`: "X/5000 characters"
- Validation message `<p>` (conditional):
  - Error (red): "Maximum 5000 characters exceeded"
  - Warning (yellow): "Minimum 500 characters required"
  - Info (blue): "Ready to generate"

**Handled Events:**
- `onChange(value: string)`: Triggered on every keystroke
- `onPaste`: Triggered on paste event (optional: trim whitespace)

**Validation Conditions:**
1. **Character Count Validation:**
   - Min: 500 characters (warning if below, button disabled)
   - Max: 5000 characters (error if exceeded, button disabled)

2. **Empty State:**
   - If text is empty, show neutral placeholder
   - Disable generate button

3. **Visual States:**
   - Default: Gray border
   - Focus: Blue border
   - Warning: Yellow border + icon
   - Error: Red border + icon
   - Success (>= 500 chars): Green border + icon

**Types:**
```typescript
interface SourceInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface ValidationState {
  isValid: boolean;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}
```

**Props:**
- `value: string` - Current text value
- `onChange: (value: string) => void` - Text change handler
- `disabled?: boolean` - Disable input during generation

---

### 4.4 StagingArea

**Description:** Container component that displays the list of generated flashcards in a "staging" state. Cards can be edited, accepted, or rejected before final save. Shows loading skeleton during generation and empty state before generation.

**Main Elements:**
- `<section>` container with responsive grid/list layout
- Header `<header>`:
  - Title: "Generated Flashcards"
  - Count indicator: "X cards"
- Content area:
  - **Loading State:** Skeleton loaders (3-5 placeholder cards)
  - **Empty State:** Illustration + message "Generate flashcards to see them here"
  - **Cards List:** Map of `FlashcardPreviewCard` components
- Footer `<footer>`:
  - Summary: "X accepted, Y rejected"

**Handled Events:**
- `onEditCard(cardId: string)`: Passes edit event to parent
- `onAcceptCard(cardId: string)`: Marks card as accepted
- `onRejectCard(cardId: string)`: Removes card from list

**Validation Conditions:**
1. **Display Validation:**
   - Show loading skeleton if `isGenerating === true`
   - Show empty state if `stagingCards.length === 0 && !isGenerating`
   - Show cards list if `stagingCards.length > 0`

2. **Card Count Validation:**
   - Track accepted vs rejected count
   - Display summary in footer

**Types:**
```typescript
interface StagingAreaProps {
  cards: StagingFlashcard[];
  isLoading: boolean;
  onEditCard: (cardId: string) => void;
  onAcceptCard: (cardId: string) => void;
  onRejectCard: (cardId: string) => void;
}
```

**Props:**
- `cards: StagingFlashcard[]` - Array of staging flashcards
- `isLoading: boolean` - Show loading skeleton
- `onEditCard: (cardId: string) => void` - Edit handler
- `onAcceptCard: (cardId: string) => void` - Accept handler
- `onRejectCard: (cardId: string) => void` - Reject handler

---

### 4.5 FlashcardPreviewCard

**Description:** Individual flashcard preview in the staging area. Displays front/back content with action buttons for edit, accept, and reject. Visual state changes based on card status (pending, accepted, rejected, edited).

**Main Elements:**
- `<div>` card container with border and shadow
- Status indicator badge (top-right): "Edited", "Accepted", or none
- Content area `<div>`:
  - Front preview `<div>`: Shows first 100 chars + "..." if truncated
  - Divider line
  - Back preview `<div>`: Shows first 100 chars + "..." if truncated
- Actions footer `<div>` with three buttons:
  - Edit button (icon: pencil)
  - Accept button (icon: check, green)
  - Reject button (icon: X, red)

**Handled Events:**
- `onEdit()`: Opens edit drawer with this card's data
- `onAccept()`: Marks card as accepted, visual feedback (green border)
- `onReject()`: Removes card from staging with slide-out animation

**Validation Conditions:**
1. **Content Display:**
   - Truncate front if > 100 characters
   - Truncate back if > 100 characters
   - Show ellipsis "..." when truncated

2. **Visual States:**
   - **Pending:** Default gray border
   - **Accepted:** Green border + checkmark badge
   - **Edited:** Blue border + "Edited" badge
   - **Rejected:** Fade out animation (removed from DOM)

3. **Button States:**
   - Accept button: Highlighted if already accepted
   - Edit button: Always enabled
   - Reject button: Always enabled

**Types:**
```typescript
interface FlashcardPreviewCardProps {
  card: StagingFlashcard;
  onEdit: () => void;
  onAccept: () => void;
  onReject: () => void;
}
```

**Props:**
- `card: StagingFlashcard` - Card data including status
- `onEdit: () => void` - Edit action handler
- `onAccept: () => void` - Accept action handler
- `onReject: () => void` - Reject action handler

---

### 4.6 CardFormDrawer

**Description:** Modal drawer for editing flashcard content. Supports both create and edit modes. Used in Generator view for editing AI-generated cards. Slides up from bottom on mobile, appears as centered modal on desktop.

**Main Elements:**
- Overlay `<div>` with semi-transparent background
- Drawer/Modal `<section>`:
  - Header `<header>`:
    - Title: "Edit Flashcard"
    - Close button (X icon)
  - Form `<form>`:
    - Front input `<input>`:
      - Label: "Front (Question)"
      - Placeholder: "Enter question..."
      - Max length: 200 characters
      - Character counter
    - Back textarea `<textarea>`:
      - Label: "Back (Answer)"
      - Placeholder: "Enter answer..."
      - Max length: 500 characters
      - Character counter
    - Validation error messages (conditional)
  - Footer `<footer>`:
    - Cancel button
    - Save button (primary, disabled if invalid)

**Handled Events:**
- `onFrontChange(value: string)`: Updates front field
- `onBackChange(value: string)`: Updates back field
- `onSave()`: Validates and saves changes
- `onCancel()`: Closes drawer without saving
- `onClose()`: Closes drawer (X button or Escape key)

**Validation Conditions:**
1. **Front Field Validation:**
   - Required: Cannot be empty
   - Max length: 200 characters
   - Show error: "Front is required" (if empty on save attempt)
   - Show error: "Maximum 200 characters" (if exceeded)

2. **Back Field Validation:**
   - Required: Cannot be empty
   - Max length: 500 characters
   - Show error: "Back is required" (if empty on save attempt)
   - Show error: "Maximum 500 characters" (if exceeded)

3. **Form Validation:**
   - Save button disabled if:
     - Front is empty
     - Back is empty
     - Front exceeds 200 chars
     - Back exceeds 500 chars
     - No changes made (in edit mode)

4. **Accessibility:**
   - Focus trap within drawer
   - Escape key closes drawer
   - Focus on first input when opened

**Types:**
```typescript
interface CardFormDrawerProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: {
    front: string;
    back: string;
  };
  onSave: (front: string, back: string) => void;
  onCancel: () => void;
}

interface CardFormState {
  front: string;
  back: string;
  errors: {
    front?: string;
    back?: string;
  };
}
```

**Props:**
- `isOpen: boolean` - Controls drawer visibility
- `mode: 'create' | 'edit'` - Determines behavior (not used in Generator, always 'edit')
- `initialData?: { front: string; back: string }` - Pre-filled values for edit mode
- `onSave: (front: string, back: string) => void` - Save handler with validated data
- `onCancel: () => void` - Cancel/close handler

---

### 4.7 DeckSelectionModal

**Description:** Modal for selecting an existing deck or creating a new one when saving flashcards. Displays list of user's decks with search/filter capability. Includes inline form for creating new deck.

**Main Elements:**
- Overlay `<div>` with semi-transparent background
- Modal `<section>`:
  - Header `<header>`:
    - Title: "Save to Deck"
    - Close button (X)
  - Search input `<input>` (optional):
    - Placeholder: "Search decks..."
    - Filters deck list client-side
  - Deck list `<div>`:
    - Scrollable list of deck cards
    - Each deck card shows:
      - Deck name
      - Card count
      - Radio button or click-to-select
    - Empty state: "No decks found. Create one below."
  - Divider `<hr>`
  - New deck section `<div>`:
    - Label: "Or create new deck"
    - Input `<input>`:
      - Placeholder: "Enter deck name..."
      - Max length: 100 characters
    - Character counter
  - Footer `<footer>`:
    - Cancel button
    - Confirm button: "Save X cards" (primary)

**Handled Events:**
- `onSearchChange(value: string)`: Filters deck list
- `onSelectDeck(deckId: string)`: Selects existing deck
- `onNewDeckNameChange(value: string)`: Updates new deck name
- `onConfirm()`: Saves to selected or new deck
- `onCancel()`: Closes modal without saving

**Validation Conditions:**
1. **Deck Selection Validation:**
   - Either existing deck selected OR new deck name provided
   - Cannot confirm if neither condition met

2. **New Deck Name Validation:**
   - If provided, must not be empty (after trim)
   - Max length: 100 characters
   - Show error: "Deck name is required" (if empty on confirm)

3. **Confirm Button State:**
   - Enabled if:
     - Existing deck selected, OR
     - New deck name is non-empty and valid
   - Disabled if:
     - No selection and no new deck name
     - New deck name exceeds max length

4. **Search Filtering:**
   - Case-insensitive search on deck name
   - Show empty state if no matches

**Types:**
```typescript
interface DeckSelectionModalProps {
  isOpen: boolean;
  decks: DeckDTO[];
  isLoading: boolean;
  cardCount: number;
  onSelectDeck: (deckId: string) => Promise<void>;
  onCreateDeck: (deckName: string) => Promise<void>;
  onCancel: () => void;
}

interface DeckSelectionState {
  searchQuery: string;
  selectedDeckId: string | null;
  newDeckName: string;
  error: string | null;
}
```

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `decks: DeckDTO[]` - List of available decks
- `isLoading: boolean` - Shows loading state while fetching decks
- `cardCount: number` - Number of cards being saved (for button label)
- `onSelectDeck: (deckId: string) => Promise<void>` - Handler for existing deck selection
- `onCreateDeck: (deckName: string) => Promise<void>` - Handler for new deck creation
- `onCancel: () => void` - Cancel handler

---

### 4.8 ActionToolbar

**Description:** Fixed toolbar containing the main action buttons (Generate and Save to Deck). Positioned at bottom on mobile, inline on desktop. Buttons are conditionally enabled based on application state.

**Main Elements:**
- Container `<section>` with fixed positioning (mobile) or static (desktop)
- Button group `<div>`:
  - Generate button `<button>`:
    - Label: "Generate Flashcards"
    - Icon: Sparkle/AI icon
    - Loading spinner (when generating)
  - Save button `<button>`:
    - Label: "Save to Deck (X cards)"
    - Icon: Save icon
    - Only visible when staging has accepted cards

**Handled Events:**
- `onGenerate()`: Triggers flashcard generation
- `onSave()`: Opens deck selection modal

**Validation Conditions:**
1. **Generate Button:**
   - Enabled if:
     - Source text >= 500 characters
     - Source text <= 5000 characters
     - Quota remaining > 0
     - Not currently generating
   - Disabled otherwise
   - Show tooltip on hover if disabled explaining why

2. **Save Button:**
   - Visible if: `stagingCards.length > 0`
   - Enabled if:
     - At least one card accepted
     - Not currently saving
   - Disabled otherwise
   - Show count of accepted cards in label

**Types:**
```typescript
interface ActionToolbarProps {
  canGenerate: boolean;
  canSave: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  acceptedCount: number;
  onGenerate: () => void;
  onSave: () => void;
}
```

**Props:**
- `canGenerate: boolean` - Enable/disable generate button
- `canSave: boolean` - Enable/disable save button
- `isGenerating: boolean` - Show loading state on generate button
- `isSaving: boolean` - Show loading state on save button
- `acceptedCount: number` - Number of accepted cards (for label)
- `onGenerate: () => void` - Generate button handler
- `onSave: () => void` - Save button handler

## 5. Types

### 5.1 Existing DTOs (from src/types.ts)

**GeneratedFlashcardDTO** - AI-generated flashcard from API
```typescript
interface GeneratedFlashcardDTO {
  front: string;
  back: string;
}
```

**GenerateFlashcardsResponseDTO** - Response from generation endpoint
```typescript
interface GenerateFlashcardsResponseDTO {
  flashcards: GeneratedFlashcardDTO[];
  generation_id: string;
  quota_remaining: number;
}
```

**ProfileDTO** - User quota information
```typescript
type ProfileDTO = Pick<
  ProfileEntity,
  "generations_count" | "last_generation_date" | "last_reset_date"
>;
```

**DeckDTO** - Deck entity for selection
```typescript
type DeckDTO = DeckEntity;
```

**CreateFlashcardCommand** - Payload for saving flashcards
```typescript
type CreateFlashcardCommand = Pick<
  TablesInsert<"flashcards">,
  "deck_id" | "front" | "back" | "creation_source" | "generation_id"
>;
```

**CardSourceType** - Enum for flashcard origin
```typescript
type CardSourceType = "AI" | "EditedAI" | "Manual";
```

### 5.2 New ViewModels for Generator View

**StagingFlashcard** - Client-side representation of a flashcard in staging
```typescript
interface StagingFlashcard {
  id: string;                    // Temporary UUID (client-generated)
  front: string;                 // Question text
  back: string;                  // Answer text
  status: CardStatus;            // Current card state
  isEdited: boolean;             // Tracks if user modified content
}

type CardStatus = 'pending' | 'accepted' | 'rejected' | 'edited';
// - pending: Initial state after generation
// - accepted: User clicked accept (green state)
// - edited: User modified front/back (blue state, also implies accepted)
// - rejected: User clicked reject (will be filtered out)
```

**GeneratorViewState** - Complete state for Generator view
```typescript
interface GeneratorViewState {
  // Input phase
  sourceText: string;            // User input (0-5000 chars)
  
  // Quota tracking
  quotaRemaining: number;        // 0-10 generations left
  
  // Generation phase
  isGenerating: boolean;         // API call in progress
  generationError: string | null; // Error message from generation
  generationId: string | null;   // ID for metrics tracking
  
  // Staging phase
  stagingCards: StagingFlashcard[]; // Generated/edited cards
  editingCardId: string | null;     // ID of card being edited
  
  // Save phase
  isSaving: boolean;             // Save API call in progress
  saveError: string | null;      // Error message from save
  showDeckModal: boolean;        // Show/hide deck selection
  decks: DeckDTO[];              // Available decks for selection
  isLoadingDecks: boolean;       // Loading decks from API
}
```

**QuotaInfo** - Structured quota data
```typescript
interface QuotaInfo {
  current: number;    // Generations used today (0-10)
  max: number;        // Maximum allowed (always 10)
  remaining: number;  // Calculated: max - current
  resetsIn: number;   // Hours until reset (calculated from last_reset_date)
}
```

**ValidationState** - UI validation feedback
```typescript
interface ValidationState {
  isValid: boolean;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}
```

**ApiError** - Standardized error structure
```typescript
interface ApiError {
  error: string;
  message: string;
  details?: Record<string, string[]>;
  retry_after?: number; // For quota exceeded (403)
}
```

## 6. State Management

### 6.1 State Architecture

The Generator view uses **local React state** managed through a custom hook `useGeneratorState`. This approach is appropriate because:
- State is view-scoped (not shared across routes)
- Complex state transitions require coordinated updates
- API calls and side effects are isolated to this view

**Custom Hook: useGeneratorState**

Location: `src/components/generator/hooks/useGeneratorState.ts`

```typescript
function useGeneratorState() {
  // State declarations
  const [state, setState] = useState<GeneratorViewState>(initialState);
  
  // Action functions
  const handleTextChange = (text: string) => { /* ... */ };
  const handleGenerate = async () => { /* ... */ };
  const handleEditCard = (cardId: string) => { /* ... */ };
  const handleSaveEdit = (cardId: string, front: string, back: string) => { /* ... */ };
  const handleAcceptCard = (cardId: string) => { /* ... */ };
  const handleRejectCard = (cardId: string) => { /* ... */ };
  const handleOpenSaveModal = async () => { /* ... */ };
  const handleSaveToExistingDeck = async (deckId: string) => { /* ... */ };
  const handleSaveToNewDeck = async (deckName: string) => { /* ... */ };
  
  // Computed values
  const canGenerate = useMemo(() => {
    return (
      state.sourceText.length >= 500 &&
      state.sourceText.length <= 5000 &&
      state.quotaRemaining > 0 &&
      !state.isGenerating
    );
  }, [state.sourceText, state.quotaRemaining, state.isGenerating]);
  
  const acceptedCards = useMemo(() => {
    return state.stagingCards.filter(c => 
      c.status === 'accepted' || c.status === 'edited'
    );
  }, [state.stagingCards]);
  
  const canSave = useMemo(() => {
    return acceptedCards.length > 0 && !state.isSaving;
  }, [acceptedCards, state.isSaving]);
  
  // Effects
  useEffect(() => {
    // Fetch quota on mount
    fetchQuotaInfo();
  }, []);
  
  return {
    state,
    actions: {
      handleTextChange,
      handleGenerate,
      handleEditCard,
      handleSaveEdit,
      handleAcceptCard,
      handleRejectCard,
      handleOpenSaveModal,
      handleSaveToExistingDeck,
      handleSaveToNewDeck,
    },
    computed: {
      canGenerate,
      canSave,
      acceptedCards,
    },
  };
}
```

### 6.2 State Transitions

**1. Initial Load → Input Phase**
```
- Fetch quota from GET /api/profile
- Initialize empty source text
- Display empty staging area
```

**2. Input Phase → Generation Phase**
```
Trigger: User clicks "Generate"
- Validate input (500-5000 chars)
- Set isGenerating = true
- Call POST /api/generate-flashcards
- On success:
  - Map response to StagingFlashcard[] (generate temp IDs)
  - Set generationId
  - Update quotaRemaining
  - Set isGenerating = false
- On error:
  - Set generationError
  - Set isGenerating = false
```

**3. Staging Phase → Edit Card**
```
Trigger: User clicks "Edit" on card
- Set editingCardId = cardId
- Open CardFormDrawer with card data
- On save:
  - Update card in stagingCards
  - Set card.isEdited = true
  - Set card.status = 'edited'
  - Close drawer
```

**4. Staging Phase → Save Cards**
```
Trigger: User clicks "Save to Deck"
- Filter accepted cards (status = 'accepted' or 'edited')
- Set showDeckModal = true
- Fetch decks from GET /api/decks
- On deck selection:
  - Map to CreateFlashcardCommand[]
  - Set creation_source based on isEdited
  - Set isSaving = true
  - Call POST /api/flashcards (bulk)
  - On success:
    - Show success toast
    - Navigate to /app/decks/[deck_id]
  - On error:
    - Set saveError
    - Keep modal open for retry
```

### 6.3 Error State Management

All API errors follow a consistent pattern:
1. Catch error in action function
2. Parse error response (ApiError structure)
3. Set appropriate error state variable
4. Display error in UI (inline or toast)
5. Allow user to retry or cancel

Example error states:
- `generationError`: Shown below SourceInput
- `saveError`: Shown in DeckSelectionModal
- Quota exceeded: Shown as banner above input with retry time

## 7. API Integration

### 7.1 Fetch Quota Information

**Trigger:** Component mount (useEffect)

**Endpoint:** `GET /api/profile`

**Request Type:** None (GET request)

**Response Type:** `ProfileDTO`

```typescript
interface ProfileDTO {
  generations_count: number;
  last_generation_date: string | null;
  last_reset_date: string | null;
}
```

**Implementation:**
```typescript
async function fetchQuotaInfo() {
  try {
    const response = await fetch('/api/profile');
    if (!response.ok) {
      throw new Error('Failed to fetch quota');
    }
    const data: ProfileDTO = await response.json();
    
    // Calculate remaining quota
    const remaining = 10 - data.generations_count;
    
    setState(prev => ({
      ...prev,
      quotaRemaining: remaining,
    }));
  } catch (error) {
    console.error('Error fetching quota:', error);
    // Don't block UI, use default quota
    setState(prev => ({ ...prev, quotaRemaining: 10 }));
  }
}
```

### 7.2 Generate Flashcards

**Trigger:** User clicks "Generate" button

**Endpoint:** `POST /api/generate-flashcards`

**Request Type:** `GenerateFlashcardsCommand`

```typescript
interface GenerateFlashcardsCommand {
  text: string; // 1-5000 characters
}
```

**Response Type:** `GenerateFlashcardsResponseDTO`

```typescript
interface GenerateFlashcardsResponseDTO {
  flashcards: GeneratedFlashcardDTO[];
  generation_id: string;
  quota_remaining: number;
}

interface GeneratedFlashcardDTO {
  front: string;
  back: string;
}
```

**Implementation:**
```typescript
async function handleGenerate() {
  setState(prev => ({ ...prev, isGenerating: true, generationError: null }));
  
  try {
    const response = await fetch('/api/generate-flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.sourceText }),
    });
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      
      // Handle quota exceeded (403)
      if (response.status === 403) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          quotaRemaining: 0,
          generationError: error.message,
        }));
        return;
      }
      
      throw new Error(error.message);
    }
    
    const data: GenerateFlashcardsResponseDTO = await response.json();
    
    // Transform to StagingFlashcard[]
    const stagingCards: StagingFlashcard[] = data.flashcards.map(fc => ({
      id: crypto.randomUUID(), // Generate client-side ID
      front: fc.front,
      back: fc.back,
      status: 'pending',
      isEdited: false,
    }));
    
    setState(prev => ({
      ...prev,
      isGenerating: false,
      generationId: data.generation_id,
      quotaRemaining: data.quota_remaining,
      stagingCards,
    }));
  } catch (error) {
    setState(prev => ({
      ...prev,
      isGenerating: false,
      generationError: error instanceof Error ? error.message : 'Failed to generate',
    }));
  }
}
```

**Error Handling:**
- **400 (Validation):** Show validation message inline
- **403 (Quota Exceeded):** Update quota UI, show "Try again in X hours"
- **500/503 (Server Error):** Show generic error, allow retry
- **Network Error:** Show "Check your connection"

### 7.3 Fetch Decks List

**Trigger:** User clicks "Save to Deck" button

**Endpoint:** `GET /api/decks`

**Request Type:** None (GET request)

**Response Type:** `ListDecksResponseDTO` (alias for `DeckDTO[]`)

```typescript
type DeckDTO = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};
```

**Implementation:**
```typescript
async function handleOpenSaveModal() {
  setState(prev => ({ ...prev, showDeckModal: true, isLoadingDecks: true }));
  
  try {
    const response = await fetch('/api/decks');
    if (!response.ok) {
      throw new Error('Failed to fetch decks');
    }
    
    const decks: DeckDTO[] = await response.json();
    
    setState(prev => ({
      ...prev,
      decks,
      isLoadingDecks: false,
    }));
  } catch (error) {
    console.error('Error fetching decks:', error);
    setState(prev => ({
      ...prev,
      isLoadingDecks: false,
      saveError: 'Failed to load decks',
    }));
  }
}
```

### 7.4 Create New Deck

**Trigger:** User enters new deck name and confirms

**Endpoint:** `POST /api/decks`

**Request Type:** `CreateDeckCommand`

```typescript
type CreateDeckCommand = {
  name: string; // Max 100 characters
};
```

**Response Type:** `DeckDTO`

**Implementation:**
```typescript
async function createDeck(name: string): Promise<string> {
  const response = await fetch('/api/decks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message);
  }
  
  const deck: DeckDTO = await response.json();
  return deck.id;
}
```

### 7.5 Save Flashcards (Bulk Create)

**Trigger:** User selects deck (existing or new) and confirms

**Endpoint:** `POST /api/flashcards`

**Request Type:** `BulkCreateFlashcardsCommand` (array of `CreateFlashcardCommand`)

```typescript
type CreateFlashcardCommand = {
  deck_id: string;
  front: string;
  back: string;
  creation_source: 'AI' | 'EditedAI' | 'Manual';
  generation_id?: string; // Include for metrics tracking
};
```

**Response Type:** `FlashcardDTO[]` (created flashcards)

**Implementation:**
```typescript
async function handleSaveToNewDeck(deckName: string) {
  setState(prev => ({ ...prev, isSaving: true, saveError: null }));
  
  try {
    // Step 1: Create deck
    const deckId = await createDeck(deckName);
    
    // Step 2: Save cards to deck
    await saveFlashcardsToDeck(deckId);
  } catch (error) {
    setState(prev => ({
      ...prev,
      isSaving: false,
      saveError: error instanceof Error ? error.message : 'Failed to save',
    }));
  }
}

async function saveFlashcardsToDeck(deckId: string) {
  // Filter accepted and edited cards
  const cardsToSave = state.stagingCards.filter(
    c => c.status === 'accepted' || c.status === 'edited'
  );
  
  // Map to CreateFlashcardCommand[]
  const payload: CreateFlashcardCommand[] = cardsToSave.map(card => ({
    deck_id: deckId,
    front: card.front,
    back: card.back,
    creation_source: card.isEdited ? 'EditedAI' : 'AI',
    generation_id: state.generationId ?? undefined,
  }));
  
  const response = await fetch('/api/flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message);
  }
  
  const created = await response.json();
  
  // Navigate to deck view
  window.location.href = `/app/decks/${deckId}`;
}
```

**Error Handling:**
- **400 (Validation):** Show error in modal, don't close
- **404 (Deck Not Found):** Show error, allow retry
- **500 (Server Error):** Show error, allow retry
- **Success:** Show toast, navigate to deck

## 8. User Interactions

### 8.1 Page Load Interaction

**User Action:** Navigates to `/app/generate`

**System Response:**
1. Render GeneratorPage with loading state
2. Fetch quota information from API
3. Display QuotaIndicator with fetched data
4. Show empty SourceInput with placeholder
5. Generate button disabled (no text)
6. Empty StagingArea with prompt

**Visual State:** Input phase, empty state

---

### 8.2 Text Input Interaction

**User Action:** Types or pastes text into SourceInput

**System Response:**
1. Update `sourceText` state on every keystroke
2. Calculate character count (display: "X/5000")
3. Validate input length:
   - If < 500: Show warning, disable Generate button
   - If 500-5000: Show success state, enable Generate button
   - If > 5000: Show error, disable Generate button
4. Update border color based on validation state

**Visual Feedback:**
- Character counter updates in real-time
- Border color changes: gray → yellow (< 500) → green (valid) → red (> 5000)
- Icon indicator: warning/success/error

---

### 8.3 Generate Flashcards Interaction

**User Action:** Clicks "Generate Flashcards" button

**System Response:**
1. Validate: source text 500-5000 chars, quota > 0
2. Set `isGenerating = true`
3. Disable Generate button, show loading spinner
4. Show loading skeleton in StagingArea (3-5 placeholder cards)
5. Call `POST /api/generate-flashcards`
6. On success:
   - Transform response to `StagingFlashcard[]`
   - Display cards in StagingArea (fade-in animation)
   - Update QuotaIndicator with new quota_remaining
   - Set `isGenerating = false`
7. On error:
   - Show error message below input
   - Re-enable Generate button
   - Set `isGenerating = false`

**Visual Transition:** Input phase → Loading → Staging phase

---

### 8.4 Accept Card Interaction

**User Action:** Clicks "Accept" button on FlashcardPreviewCard

**System Response:**
1. Update card status: `card.status = 'accepted'`
2. Visual feedback:
   - Add green border to card
   - Show checkmark badge
   - Highlight accept button
3. Update staging footer count: "X accepted, Y rejected"
4. Enable "Save to Deck" button if at least one card accepted

**Visual Feedback:** Card border turns green, checkmark appears

---

### 8.5 Reject Card Interaction

**User Action:** Clicks "Reject" (X) button on FlashcardPreviewCard

**System Response:**
1. Add slide-out animation to card
2. Remove card from `stagingCards` array
3. Update staging footer count
4. If all cards rejected:
   - Show empty state in StagingArea
   - Disable "Save to Deck" button

**Visual Feedback:** Card slides out and disappears

---

### 8.6 Edit Card Interaction

**User Action:** Clicks "Edit" button on FlashcardPreviewCard

**System Response:**
1. Set `editingCardId = card.id`
2. Open CardFormDrawer (slide up on mobile, modal on desktop)
3. Pre-fill form with current `card.front` and `card.back`
4. Focus on front input field
5. Enable form validation

**Sub-interaction: Save Edit**

**User Action:** Modifies text and clicks "Save"

**System Response:**
1. Validate: front and back required, within char limits
2. Update card in `stagingCards`:
   - `card.front = newFront`
   - `card.back = newBack`
   - `card.isEdited = true`
   - `card.status = 'edited'`
3. Close CardFormDrawer
4. Visual feedback on card:
   - Add blue border
   - Show "Edited" badge

**Sub-interaction: Cancel Edit**

**User Action:** Clicks "Cancel" or Escape key

**System Response:**
1. Close CardFormDrawer without saving
2. No changes to card state

---

### 8.7 Save to Deck Interaction

**User Action:** Clicks "Save to Deck (X cards)" button

**System Response:**
1. Set `showDeckModal = true`
2. Set `isLoadingDecks = true`
3. Fetch decks from `GET /api/decks`
4. Display DeckSelectionModal with:
   - List of existing decks (if any)
   - Search/filter input
   - "Create new deck" section
5. Set `isLoadingDecks = false`

**Sub-interaction 8.7a: Select Existing Deck**

**User Action:** Clicks on existing deck, then "Save X cards"

**System Response:**
1. Validate: deck selected
2. Set `isSaving = true`
3. Map accepted cards to `CreateFlashcardCommand[]`:
   - Set `deck_id` to selected deck
   - Set `creation_source` based on `isEdited`
   - Include `generation_id` for metrics
4. Call `POST /api/flashcards` (bulk)
5. On success:
   - Close DeckSelectionModal
   - Show success toast: "X cards saved to [Deck Name]"
   - Navigate to `/app/decks/[deck_id]`
6. On error:
   - Show error in modal
   - Keep modal open
   - Set `isSaving = false`

**Sub-interaction 8.7b: Create New Deck**

**User Action:** Types new deck name, then "Save X cards"

**System Response:**
1. Validate: deck name not empty, <= 100 chars
2. Set `isSaving = true`
3. Call `POST /api/decks` with new name
4. On success:
   - Get new deck ID
   - Proceed with saving cards to new deck (same as 8.7a)
5. On error:
   - Show error: "Failed to create deck"
   - Keep modal open
   - Set `isSaving = false`

---

### 8.8 Error Recovery Interactions

**Scenario: Quota Exceeded (403)**

**System Display:**
- Banner above input: "Daily limit reached (10/10). Quota resets in 5.3 hours."
- Generate button disabled
- QuotaIndicator shows 0/10

**User Action:** None (must wait for reset)

---

**Scenario: Generation Failed (500)**

**System Display:**
- Error message below input: "Failed to generate. Please try again."
- Generate button re-enabled

**User Action:** Clicks "Generate" again

**System Response:** Retry generation

---

**Scenario: Save Failed (500)**

**System Display:**
- Error in DeckSelectionModal: "Failed to save cards. Please try again."
- Modal stays open
- "Save X cards" button re-enabled

**User Action:** Clicks "Save X cards" again

**System Response:** Retry save operation

## 9. Conditions and Validation

### 9.1 Input Phase Validations

#### SourceInput Character Length

**Validation Rule:**
```typescript
const MIN_CHARS = 500;
const MAX_CHARS = 5000;

const validation = {
  isEmpty: sourceText.length === 0,
  tooShort: sourceText.length > 0 && sourceText.length < MIN_CHARS,
  valid: sourceText.length >= MIN_CHARS && sourceText.length <= MAX_CHARS,
  tooLong: sourceText.length > MAX_CHARS,
};
```

**UI States:**
- **Empty (0 chars):**
  - Border: Gray
  - Message: None
  - Button: Disabled

- **Too Short (1-499 chars):**
  - Border: Yellow
  - Message: "Minimum 500 characters required"
  - Icon: Warning
  - Button: Disabled

- **Valid (500-5000 chars):**
  - Border: Green
  - Message: "Ready to generate"
  - Icon: Checkmark
  - Button: Enabled (if quota available)

- **Too Long (> 5000 chars):**
  - Border: Red
  - Message: "Maximum 5000 characters exceeded"
  - Icon: Error
  - Button: Disabled

#### Quota Validation

**Validation Rule:**
```typescript
const quotaValidation = {
  available: quotaRemaining > 0,
  exhausted: quotaRemaining === 0,
};
```

**UI States:**
- **Available (remaining > 0):**
  - QuotaIndicator: Green/Yellow based on level
  - Generate button: Enabled (if text valid)

- **Exhausted (remaining = 0):**
  - QuotaIndicator: Red
  - Banner: "Daily limit reached. Resets in X hours."
  - Generate button: Disabled
  - Tooltip: "You've used all 10 generations today"

### 9.2 Staging Phase Validations

#### Card Status for Save

**Validation Rule:**
```typescript
const acceptedCards = stagingCards.filter(
  card => card.status === 'accepted' || card.status === 'edited'
);

const canSave = acceptedCards.length > 0 && !isSaving;
```

**UI States:**
- **No Accepted Cards:**
  - Save button: Hidden or disabled
  - Footer: "0 accepted"

- **At Least One Accepted:**
  - Save button: Visible and enabled
  - Footer: "X accepted, Y rejected"
  - Button label: "Save to Deck (X cards)"

#### Card Content Validation (Edit)

**Validation Rule:**
```typescript
const cardValidation = {
  frontValid: front.trim().length > 0 && front.length <= 200,
  backValid: back.trim().length > 0 && back.length <= 500,
};

const formValid = cardValidation.frontValid && cardValidation.backValid;
```

**UI States in CardFormDrawer:**
- **Front Invalid:**
  - Error message: "Front is required" (if empty)
  - Error message: "Maximum 200 characters" (if too long)
  - Save button: Disabled

- **Back Invalid:**
  - Error message: "Back is required" (if empty)
  - Error message: "Maximum 500 characters" (if too long)
  - Save button: Disabled

- **Both Valid:**
  - No error messages
  - Save button: Enabled

### 9.3 Deck Selection Validations

#### Deck Selection Validation

**Validation Rule:**
```typescript
const deckSelectionValid = 
  (selectedDeckId !== null) || 
  (newDeckName.trim().length > 0 && newDeckName.length <= 100);
```

**UI States:**
- **No Selection, No New Name:**
  - Confirm button: Disabled
  - Tooltip: "Select a deck or create a new one"

- **Existing Deck Selected:**
  - Confirm button: Enabled
  - Label: "Save to [Deck Name]"

- **New Deck Name Provided:**
  - Confirm button: Enabled (if valid)
  - Label: "Create & Save"

- **New Deck Name Invalid:**
  - Error: "Deck name is required" (if empty)
  - Error: "Maximum 100 characters" (if too long)
  - Confirm button: Disabled

### 9.4 API-Level Validations

#### Generate Flashcards Endpoint

**Request Validation (enforced by API):**
- `text`: Required, 1-5000 characters
- Quota: User must have remaining generations

**Frontend Pre-Validation:**
- Check text length before API call
- Check quota before API call
- If validation fails, don't call API

**Error Responses:**
- 400: Validation error (shouldn't happen if frontend validates)
- 403: Quota exceeded (show retry time)
- 500/503: Server error (allow retry)

#### Save Flashcards Endpoint

**Request Validation (enforced by API):**
- `deck_id`: Required, valid UUID, must exist and belong to user
- `front`: Required, max 200 characters
- `back`: Required, max 500 characters
- `creation_source`: Must be 'AI', 'EditedAI', or 'Manual'

**Frontend Pre-Validation:**
- Filter out rejected cards
- Ensure all cards have non-empty front/back
- Set correct creation_source based on isEdited flag

**Error Responses:**
- 400: Validation error (re-check frontend validation)
- 404: Deck not found (show error, allow deck re-selection)
- 500: Server error (allow retry)

## 10. Error Handling

### 10.1 API Error Handling Strategy

All API calls follow a consistent error handling pattern:

1. **Try-Catch Block:** Wrap all fetch calls
2. **Response Status Check:** Check `response.ok` before parsing
3. **Parse Error Body:** Extract `ApiError` structure
4. **Set Error State:** Update appropriate error state variable
5. **Display Error:** Show error in UI (inline or toast)
6. **Allow Retry:** Keep state that allows user to retry

**Standard Error Structure:**
```typescript
interface ApiError {
  error: string;        // Error type (e.g., "Validation Error")
  message: string;      // User-friendly message
  details?: any;        // Additional error details
  retry_after?: number; // Seconds until retry (for 403)
}
```

### 10.2 Specific Error Scenarios

#### 10.2.1 Generation Errors

**Error: Quota Exceeded (403)**

**Handling:**
```typescript
if (response.status === 403) {
  const error: ApiError = await response.json();
  
  // Calculate retry time
  const retryAfterHours = error.retry_after 
    ? (error.retry_after / 3600).toFixed(1) 
    : 'Unknown';
  
  setState(prev => ({
    ...prev,
    isGenerating: false,
    quotaRemaining: 0,
    generationError: `Daily limit reached. Quota resets in ${retryAfterHours} hours.`,
  }));
  
  return; // Don't throw, handle gracefully
}
```

**UI Display:**
- Red banner above input with retry time
- QuotaIndicator shows 0/10 (red)
- Generate button disabled with tooltip

---

**Error: Service Unavailable (503)**

**Handling:**
```typescript
if (response.status === 503) {
  const error: ApiError = await response.json();
  
  setState(prev => ({
    ...prev,
    isGenerating: false,
    generationError: 'AI service temporarily unavailable. Please try again in a few moments.',
  }));
  
  return;
}
```

**UI Display:**
- Warning message below input
- Generate button re-enabled for retry
- Optional: Auto-retry after 5 seconds

---

**Error: Server Error (500)**

**Handling:**
```typescript
if (response.status === 500) {
  const error: ApiError = await response.json();
  
  setState(prev => ({
    ...prev,
    isGenerating: false,
    generationError: 'Failed to generate flashcards. Please try again.',
  }));
  
  console.error('Generation error:', error);
  return;
}
```

**UI Display:**
- Error message below input
- Generate button re-enabled for retry

---

**Error: Network Error**

**Handling:**
```typescript
catch (error) {
  // Network error (fetch failed)
  setState(prev => ({
    ...prev,
    isGenerating: false,
    generationError: 'Network error. Please check your connection and try again.',
  }));
}
```

**UI Display:**
- Error message below input
- Generate button re-enabled for retry

---

**Error: Empty Response (No Cards Generated)**

**Handling:**
```typescript
const data: GenerateFlashcardsResponseDTO = await response.json();

if (data.flashcards.length === 0) {
  setState(prev => ({
    ...prev,
    isGenerating: false,
    generationError: 'No flashcards could be generated from this text. Try different content.',
  }));
  return;
}
```

**UI Display:**
- Warning message below input
- Suggest trying different text
- Stay in input phase

#### 10.2.2 Save Errors

**Error: Deck Not Found (404)**

**Handling:**
```typescript
if (response.status === 404) {
  setState(prev => ({
    ...prev,
    isSaving: false,
    saveError: 'Selected deck not found. It may have been deleted. Please select another deck.',
  }));
  
  // Refresh deck list
  await fetchDecks();
  return;
}
```

**UI Display:**
- Error message in DeckSelectionModal
- Modal stays open
- Deck list refreshed
- Allow user to select different deck

---

**Error: Validation Error (400)**

**Handling:**
```typescript
if (response.status === 400) {
  const error: ApiError = await response.json();
  
  setState(prev => ({
    ...prev,
    isSaving: false,
    saveError: `Validation error: ${error.message}`,
  }));
  
  console.error('Validation error details:', error.details);
  return;
}
```

**UI Display:**
- Error message in modal
- Log details to console (for debugging)
- Allow retry

---

**Error: Server Error (500)**

**Handling:**
```typescript
if (response.status === 500) {
  setState(prev => ({
    ...prev,
    isSaving: false,
    saveError: 'Failed to save flashcards. Please try again.',
  }));
  return;
}
```

**UI Display:**
- Error message in modal
- Modal stays open
- Save button re-enabled for retry

#### 10.2.3 Loading Errors

**Error: Failed to Load Quota**

**Handling:**
```typescript
catch (error) {
  console.error('Error fetching quota:', error);
  
  // Use default quota to not block user
  setState(prev => ({
    ...prev,
    quotaRemaining: 10, // Assume full quota
  }));
  
  // Show non-blocking warning toast
  showToast('Warning: Could not load quota information', 'warning');
}
```

**UI Display:**
- Non-blocking toast notification
- Allow user to proceed with default quota

---

**Error: Failed to Load Decks**

**Handling:**
```typescript
catch (error) {
  setState(prev => ({
    ...prev,
    isLoadingDecks: false,
    saveError: 'Failed to load decks. Please try again.',
  }));
}
```

**UI Display:**
- Error message in DeckSelectionModal
- "Retry" button to fetch decks again
- "Create New Deck" still available (fallback)

### 10.3 Edge Cases

#### 10.3.1 Concurrent Requests

**Scenario:** User clicks Generate multiple times rapidly

**Prevention:**
```typescript
function handleGenerate() {
  if (state.isGenerating) {
    return; // Ignore if already generating
  }
  
  // Proceed with generation...
}
```

**UI:** Disable Generate button while `isGenerating === true`

---

#### 10.3.2 Stale Data

**Scenario:** Decks list changed since modal opened

**Mitigation:**
- Refresh decks list every time modal opens
- Handle 404 if selected deck was deleted

---

#### 10.3.3 Browser Back/Refresh

**Scenario:** User navigates back or refreshes during staging

**Impact:** Staging data lost (not persisted)

**Mitigation:**
- Show browser confirmation if staging has unsaved cards:
```typescript
useEffect(() => {
  const hasUnsavedCards = state.stagingCards.length > 0;
  
  if (hasUnsavedCards) {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved flashcards. Are you sure you want to leave?';
      return e.returnValue;
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }
}, [state.stagingCards]);
```

---

#### 10.3.4 All Cards Rejected

**Scenario:** User rejects all generated cards

**Handling:**
- Show empty state in StagingArea
- Disable/hide Save button
- Message: "No cards to save. Generate more or edit existing cards."

---

#### 10.3.5 API Response Timeout

**Scenario:** Generation takes too long (>30s)

**Handling:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s

try {
  const response = await fetch('/api/generate-flashcards', {
    signal: controller.signal,
    // ... other options
  });
  
  clearTimeout(timeoutId);
  // ... handle response
} catch (error) {
  if (error.name === 'AbortError') {
    setState(prev => ({
      ...prev,
      isGenerating: false,
      generationError: 'Request timed out. The text may be too complex. Try shorter text.',
    }));
  }
}
```

**UI Display:**
- Timeout error message
- Suggest shorter text
- Allow retry

## 11. Implementation Steps

### Step 1: Setup File Structure
1. Create directory: `src/components/generator/`
2. Create directory: `src/components/generator/hooks/`
3. Create Astro page: `src/pages/app/generate.astro`
4. Create component files (empty shells):
   - `GeneratorPage.tsx`
   - `QuotaIndicator.tsx`
   - `SourceInput.tsx`
   - `StagingArea.tsx`
   - `FlashcardPreviewCard.tsx`
   - `ActionToolbar.tsx`
   - `DeckSelectionModal.tsx`
5. Create shared component (if not exists): `src/components/ui/CardFormDrawer.tsx`
6. Create custom hook: `src/components/generator/hooks/useGeneratorState.ts`

---

### Step 2: Define Types
1. Add new ViewModels to `src/types.ts`:
   - `StagingFlashcard`
   - `CardStatus` type
   - `GeneratorViewState`
   - `QuotaInfo`
   - `ValidationState`
2. Verify existing DTOs are imported:
   - `GeneratedFlashcardDTO`
   - `GenerateFlashcardsResponseDTO`
   - `ProfileDTO`
   - `DeckDTO`
   - `CreateFlashcardCommand`
3. Export all types

---

### Step 3: Implement Astro Wrapper Page
1. Open `src/pages/app/generate.astro`
2. Add layout import: `import Layout from '@/layouts/Layout.astro'`
3. Add GeneratorPage component import
4. Render GeneratorPage with `client:load` directive:
   ```astro
   ---
   import Layout from '@/layouts/Layout.astro';
   import GeneratorPage from '@/components/generator/GeneratorPage';
   ---
   
   <Layout title="Generate Flashcards">
     <GeneratorPage client:load />
   </Layout>
   ```

---

### Step 4: Implement Custom Hook (useGeneratorState)
1. Open `src/components/generator/hooks/useGeneratorState.ts`
2. Define initial state constant
3. Implement useState with `GeneratorViewState` type
4. Implement computed values (useMemo):
   - `canGenerate`
   - `acceptedCards`
   - `canSave`
5. Implement action functions:
   - `fetchQuotaInfo()` - GET /api/profile
   - `handleTextChange(text: string)`
   - `handleGenerate()` - POST /api/generate-flashcards
   - `handleEditCard(cardId: string)`
   - `handleSaveEdit(cardId: string, front: string, back: string)`
   - `handleAcceptCard(cardId: string)`
   - `handleRejectCard(cardId: string)`
   - `handleOpenSaveModal()` - GET /api/decks
   - `handleSaveToExistingDeck(deckId: string)`
   - `handleSaveToNewDeck(deckName: string)` - POST /api/decks + flashcards
6. Implement useEffect for quota fetch on mount
7. Implement useEffect for beforeunload warning (unsaved cards)
8. Return state, actions, and computed values

---

### Step 5: Implement QuotaIndicator Component
1. Open `src/components/generator/QuotaIndicator.tsx`
2. Define props interface: `QuotaIndicatorProps`
3. Implement component structure:
   - Label "Generations Left"
   - Progress bar (calculate percentage)
   - Numerical display "X/10"
   - Color coding based on remaining:
     - Green: 7-10
     - Yellow: 4-6
     - Orange: 1-3
     - Red: 0
4. Add Tailwind styling
5. Export component

---

### Step 6: Implement SourceInput Component
1. Open `src/components/generator/SourceInput.tsx`
2. Define props interface: `SourceInputProps`
3. Implement validation logic (useMemo):
   - Character count validation (500-5000)
   - Validation state calculation
4. Implement component structure:
   - Textarea with auto-resize
   - Character counter
   - Validation message (conditional)
   - Validation icon (conditional)
5. Implement event handlers:
   - onChange handler
6. Add dynamic styling based on validation state
7. Add Tailwind classes
8. Export component

---

### Step 7: Implement FlashcardPreviewCard Component
1. Open `src/components/generator/FlashcardPreviewCard.tsx`
2. Define props interface: `FlashcardPreviewCardProps`
3. Implement truncation logic (useMemo):
   - Truncate front if > 100 chars
   - Truncate back if > 100 chars
4. Implement component structure:
   - Card container
   - Status badge (conditional)
   - Front preview
   - Divider
   - Back preview
   - Action buttons (Edit, Accept, Reject)
5. Implement dynamic styling based on card status:
   - Pending: gray border
   - Accepted: green border + badge
   - Edited: blue border + badge
6. Add button event handlers
7. Add Tailwind classes
8. Export component

---

### Step 8: Implement StagingArea Component
1. Open `src/components/generator/StagingArea.tsx`
2. Define props interface: `StagingAreaProps`
3. Calculate counts (useMemo):
   - Accepted count
   - Rejected count (total - current length)
4. Implement component structure:
   - Header with title and count
   - Content area:
     - Loading skeleton (conditional)
     - Empty state (conditional)
     - Cards grid/list (map FlashcardPreviewCard)
   - Footer with summary
5. Implement LoadingSkeleton sub-component (3-5 cards)
6. Add Tailwind responsive grid
7. Export component

---

### Step 9: Implement ActionToolbar Component
1. Open `src/components/generator/ActionToolbar.tsx`
2. Define props interface: `ActionToolbarProps`
3. Implement component structure:
   - Container (fixed on mobile, static on desktop)
   - Generate button:
     - Label + icon
     - Loading spinner (conditional)
     - Disabled state
     - Tooltip (conditional)
   - Save button:
     - Label with card count
     - Icon
     - Loading spinner (conditional)
     - Conditional render (only if cards exist)
4. Add Tailwind styling (mobile-first)
5. Add responsive breakpoints
6. Export component

---

### Step 10: Implement CardFormDrawer Component (Shared)
1. Open or create `src/components/ui/CardFormDrawer.tsx`
2. Define props interface: `CardFormDrawerProps`
3. Define internal state: `CardFormState`
4. Implement validation logic:
   - Front validation (required, max 200)
   - Back validation (required, max 500)
5. Implement component structure:
   - Overlay
   - Drawer/Modal container
   - Header with close button
   - Form with inputs:
     - Front input (with counter)
     - Back textarea (with counter)
     - Error messages (conditional)
   - Footer with Cancel and Save buttons
6. Implement event handlers:
   - onFrontChange, onBackChange
   - onSave (with validation)
   - onCancel, onClose
7. Implement focus trap and Escape key listener
8. Add Tailwind styling (drawer on mobile, modal on desktop)
9. Export component

---

### Step 11: Implement DeckSelectionModal Component
1. Open `src/components/generator/DeckSelectionModal.tsx`
2. Define props interface: `DeckSelectionModalProps`
3. Define internal state: `DeckSelectionState`
4. Implement search/filter logic (useMemo)
5. Implement component structure:
   - Overlay
   - Modal container
   - Header with close button
   - Search input (optional)
   - Decks list:
     - Loading state
     - Empty state
     - Deck cards (map)
   - Divider
   - New deck section:
     - Label
     - Input (with counter)
     - Validation error (conditional)
   - Footer with Cancel and Confirm buttons
6. Implement event handlers:
   - onSearchChange
   - onSelectDeck
   - onNewDeckNameChange
   - onConfirm
   - onCancel
7. Implement validation logic for confirm button
8. Add Tailwind styling
9. Export component

---

### Step 12: Implement GeneratorPage Main Component
1. Open `src/components/generator/GeneratorPage.tsx`
2. Import all child components
3. Import custom hook: `useGeneratorState`
4. Call hook: `const { state, actions, computed } = useGeneratorState()`
5. Implement component structure (using component tree from section 3):
   - Main container
   - Header with QuotaIndicator
   - SourceInput (conditional: show if no staging cards)
   - StagingArea (conditional: show if has cards or generating)
   - ActionToolbar (always visible, conditional button states)
   - CardFormDrawer (modal)
   - DeckSelectionModal (modal)
6. Wire up all event handlers to actions
7. Pass state and computed values as props
8. Add responsive layout (Tailwind grid)
9. Export component

---

### Step 13: Styling & Responsiveness
1. **Mobile View (<768px):**
   - Verify vertical stack layout
   - Check ActionToolbar is fixed at bottom
   - Check drawer slides up from bottom
   - Verify touch targets (min 44px)
   - Check text readability

2. **Desktop View (≥768px):**
   - Verify two-column layout if applicable
   - Check modals appear centered
   - Check hover states on buttons
   - Verify adequate spacing

3. **Accessibility:**
   - Check keyboard navigation (Tab, Enter, Escape)
   - Verify focus trap in modals
   - Check ARIA labels
   - Check screen reader compatibility

---

### Step 14: Linting & Cleanup
1. Run ESLint: `npm run lint`
2. Fix any linting errors
3. Remove unused imports
4. Remove console.log statements (keep console.error)
5. Add JSDoc comments to complex functions
6. Format code with Prettier (if configured)

---

### Step 15: Documentation & Handoff
1. Update component documentation (if applicable)
2. Document any known issues or limitations
3. Add inline comments for complex logic
4. Update project README if needed
5. Prepare demo/walkthrough for team review

---

## End of Implementation Plan

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-16  
**Author:** Robert Zdanowski  
**Status:** Ready for Implementation