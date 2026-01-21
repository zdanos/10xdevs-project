# UI Architecture for FlashCard AI MVP

## 1. UI Structure Overview

The FlashCard AI MVP User Interface is designed with a **Mobile-First** approach, utilizing a hybrid rendering strategy to balance performance and interactivity.

* **Framework:** Astro 5 (Core layout, routing, SSR) + React 19 (Interactive "Islands").
* **Rendering Strategy:**
    * **SSR (Server-Side Rendering):** Used for Dashboard, Deck Library, and Profile views to ensure fast First Contentful Paint (FCP) and secure data fetching.
    * **Client-Side (React Islands):** Used for high-interactivity zones: Generator (State Management), Study Mode (Complex logic & Animations), and Deck/Card Editing.
* **State Management:**
    * **Global:** Astro Middleware (Auth Session) & Nano Stores (Toast Notifications, Optimistic UI updates).
    * **Local/Page:** React `useState` / `useReducer` for the Generator Staging Area and Study Session progress.
* **Visual Identity:** Clean, minimalist aesthetic with **Green** as the primary action color. Typography utilizes Slate-900 (High Contrast) scaling dynamically for readability.

---

## 2. List of Views

### 2.1. Public & Auth Views

**View: Landing Page**
* **Route:** `/` (Static)
* **Goal:** Convert visitors into users.
* **Key Info:** Value proposition (AI-powered, SM-2 algorithm), "Get Started" CTA.
* **Components:** Hero Section, Feature Highlights, Footer.

**View: Authentication**
* **Route:** `/login`, `/register` (SSR)
* **Goal:** Secure user access.
* **Components:** Supabase Auth Widget (Email/Password), Error Message container.

### 2.2. Application Views (Protected `/app/*`)

**View: Dashboard**
* **Route:** `/app/dashboard` (SSR)
* **Goal:** Central hub for navigation and immediate study entry.
* **Key Info:**
    * User Profile summary.
    * "Cards due today" count.
    * Shortcut to most recent deck or Generator.
* **Components:**
    * `StatsSummary` (Cards due, Generations left).
    * `QuickActions` (Links to Generate, Library).
    * `EmptyState` (If no decks: prominent CTA to Generator).

**View: Deck Library (All Decks)**
* **Route:** `/app/decks` (SSR)
* **Goal:** Manage the complete collection of flashcard decks.
* **Key Info:** List of all user decks.
* **Data Presentation:** **Sorted Alphabetically (A-Z)** to ensure predictable ordering without complex backend logic for "last used".
* **Components:**
    * `CreateDeckButton`: Triggers a modal/prompt for a new deck name.
    * `DeckGrid`: Responsive grid/list display of decks.
    * `SearchFilter`: Simple text input to filter decks by name (Client-side filtering).

**View: Deck Details**
* **Route:** `/app/decks/[id]` (SSR + Hydrated Components)
* **Goal:** Manage a specific collection (Edit Name, Add/Edit Cards, Study).
* **Key Info:** Deck title, Total cards, Study status.
* **Components:**
    * `DeckHeader`:
        * Displays Deck Title.
        * **Actions:** "Rename Deck" (Icon/Menu), "Delete Deck" (Danger Action).
        * Primary CTA: "Study Now".
    * `FlashcardList`: Scrollable list of cards in the deck.
    * `AddCardButton`: **Floating Action Button (FAB)** (bottom-right on mobile) / Standard Button (desktop) to open the creation drawer.
    * `CardFormDrawer`: Handles both *Creating* new cards and *Editing* existing ones.
* **UX/Safety:**
    * **Renaming:** Optimistic UI updates the title immediately while saving to API in background.
    * **Deleting:** Two-step confirmation (Action Sheet) to prevent accidental data loss.

**View: AI Generator (The "Creation Flow")**
* **Route:** `/app/generate` (React Island - `client:load`)
* **Goal:** Convert raw text into verified flashcards.
* **Key Info:** Text input, Generation quota, Generated cards preview (Staging Area).
* **Components:**
    * `QuotaIndicator`: Visual bar showing `generations_count` limit.
    * `SourceInput`: Text area (min. 500 chars) with paste functionality.
    * `StagingArea`: List of editable card drafts (Front/Back inputs).
    * `ActionToolbar`: "Generate", "Save to Deck".
* **UX/Safety:**
    * **Client-Side Staging:** Cards exist only in memory until "Save" is clicked.
    * **Validation:** Prevents saving empty cards.
    * **Feedback:** Loading skeletons during AI processing.

**View: Study Mode**
* **Route:** `/app/study/[id]` (React Island - `client:only`)
* **Goal:** Execute the Spaced Repetition (SM-2) session.
* **Key Info:** Current Card (Front), Hidden Back, Progress (X/Y cards).
* **Components:**
    * `FlashcardDisplay`: Large, legible card container. Flip animation.
    * `ControlPad`:
        * Phase 1: "Show Answer" (Full width).
        * Phase 2: Rating Buttons (Again/Hard/Good/Easy) - Large touch targets (min 44px).
    * `SessionSummary`: Displayed when the queue is empty.
* **UX/Performance:** Prefetching next batch of cards in background. Optimistic UI updates (immediate slide to next card upon rating).

---

## 3. User Journey Map

### Primary Scenario: AI Creation Flow
1.  **Dashboard Entry:** User lands on `/app/dashboard`. Checks "Generations Left".
2.  **Input Phase:** User navigates to `/app/generate`. Pastes lecture notes into `SourceInput`. Clicks **Generate**.
3.  **Processing:** UI shows a skeleton loader. Edge Function runs.
4.  **Verification (Staging):** Screen populates with proposed flashcards.
    * *Interaction:* User edits Card #3.
5.  **Commit:** User clicks **"Save to Deck"**. Modal asks for existing deck selection or "New Deck Name". User types "History 101" -> Save.
6.  **Transition:** Toast notification: "Deck Saved!". Redirects to `/app/decks/[new_id]`.

### Secondary Scenario: Manual Creation & Management
1.  **Library Access:** User navigates to `/app/decks`.
2.  **Create Deck:** Clicks "New Deck". Enters name "Basic Spanish". Confirms.
3.  **Redirection:** User is taken to `/app/decks/[new_id]`. The list is empty.
4.  **Rename (Correction):** User realizes a typo. Clicks "Edit" icon next to title. Renames to "Basic Spanish A1". Title updates instantly.
5.  **Add Card:** User taps the **FAB (+)**.
6.  **Entry:** Drawer slides up. User types Front: "Perro", Back: "Dog".
7.  **Save & Continue:** User taps "Save & Add Another". Form clears, toast confirms.
8.  **Result:** The Deck Details view lists the new cards.

---

## 4. Layout & Navigation Structure

The navigation adapts based on the viewport, strictly following **Mobile-First** principles.

### Mobile Layout (< 768px)
* **Bottom Navigation Bar:** Sticky at bottom.
    * Items: **Home** (Dashboard), **Decks** (Library), **Generate** (Center, highlighted), **Profile**.
* **Contextual Headers:**
    * Top Bar: Shows current Page Title and "Back" button (if deep in hierarchy like Study Mode).
* **Drawers (Sheets):** Used for editing forms (Deck Edit, Card Edit) to avoid full page redirects.

### Desktop Layout (>= 768px)
* **Sidebar Navigation:** Fixed left column.
    * Logo at top.
    * Vertical list of links: Dashboard, Library (Decks), Generate, Profile.
* **Modals:** Drawers transform into centered Modals for editing content.
* **Two-Column Dashboard:** Recent Decks on left, Stats/Activity on right.

### Global Elements
* **Toasts:** Slide in from Top-Right (Desktop) or Bottom-Center (Mobile) for API feedback (Success/Error).

---

## 5. Key Components

### A. The "Flashcard" Component
* **Usage:** Study Mode, Preview in Generator.
* **Behavior:** Supports `isFlipped` state.
* **Typography:** Text automatically scales (`text-xl` to `text-sm`) based on character count.

### B. Rating Controls (SM-2)
* **Usage:** Study Mode.
* **Structure:** Grid of 4 buttons (Again/Hard/Good/Easy).
* **Accessibility:** Labels + Color coding + Keyboard shortcuts (1, 2, 3, 4).

### C. CardFormDrawer (Unified Create/Edit)
* **Usage:** Deck Details (Manual Add) & Generator (Edit Draft).
* **Behavior:**
    * **Mode `Create`:** Inputs empty. Action: "Add". Optional "Add & Next" toggle.
    * **Mode `Edit`:** Inputs pre-filled. Action: "Save Changes".
* **Accessibility:** Focus trap within the drawer. "Escape" key closes it.

### D. DeckActionMenu
* **Usage:** Deck Details Header.
* **Items:**
    * **Rename:** Triggers a simple browser prompt or custom modal input.
    * **Delete:** Triggers a high-friction confirmation modal (Action Sheet).