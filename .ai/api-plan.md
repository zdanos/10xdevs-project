# REST API Plan

This document defines the API structure for the FlashCard AI MVP application. The architecture relies on Supabase services: the auto-generated REST API (PostgREST) for CRUD operations and database interaction, and Edge Functions for external logic (OpenAI).

## 1. Resources

The main API resources map directly to database tables and server-side functions:

| Resource | Table/Source | Description |
| --- | --- | --- |
| **Auth** | `auth.users` | Session and identity management (Supabase GoTrue). |
| **Decks** | `public.decks` | Collections organizing flashcards. |
| **Flashcards** | `public.flashcards` | Study materials containing content and SM-2 algorithm data. |
| **Profiles** | `public.profiles` | User metadata, limits, and usage statistics. |
| **AI Generation** | *Edge Function* | Stateless endpoint for communication with OpenAI. |
| **Reviews** | *Edge Function* | Logic for processing flashcard ratings using `supermemo` library. |

---

## 2. Endpoints

The following endpoints use standard Supabase prefixes:
* `/rest/v1/` - for database operations (PostgREST).
* `/functions/v1/` - for serverless functions (Edge Functions).

### 2.1. AI Generation (Edge Function)

#### **Generate Flashcards**
* **Method:** `POST`
* **URL:** `/functions/v1/generate-flashcards`
* **Description:** Accepts user text, checks database quotas via RPC, and returns flashcard proposals from OpenAI.
* **Required Headers:** `Authorization: Bearer <user_token>`
* **Request Payload (JSON):**
    ```json
    {
      "text": "Notes text to process (max 5000 chars)..."
    }
    ```
* **Response Payload (Success 200):**
    ```json
    {
      "flashcards": [
        { "front": "Question 1", "back": "Answer 1" },
        { "front": "Question 2", "back": "Answer 2" }
      ],
      "quota_remaining": 9
    }
    ```
* **Business Logic:**
    1.  Function calls RPC `check_and_reset_quota`.
    2.  If RPC returns error (quota exceeded), return `403 Forbidden`.
    3.  Sends request to OpenAI (GPT-4o-mini).
    4.  Returns result to the frontend "Staging Area" without saving to the DB.

### 2.2. Decks

#### **List Decks**
* **Method:** `GET`
* **URL:** `/rest/v1/decks?select=*&order=created_at.desc`
* **Description:** Fetches the list of decks for the logged-in user.
* **Response:** Array of Deck objects.

#### **Create Deck**
* **Method:** `POST`
* **URL:** `/rest/v1/decks`
* **Description:** Creates a new deck.
* **Request Payload:**
    ```json
    { "name": "History 101" }
    ```
* **Success:** `201 Created`.

#### **Update Deck Name**
* **Method:** `PATCH`
* **URL:** `/rest/v1/decks?id=eq.{uuid}`
* **Description:** Renames an existing deck.
* **Request Payload:**
    ```json
    { "name": "Advanced History" }
    ```
* **Success:** `204 No Content` (or `200 OK` with returned representation).

#### **Delete Deck**
* **Method:** `DELETE`
* **URL:** `/rest/v1/decks?id=eq.{uuid}`
* **Description:** Deletes a deck. Due to `ON DELETE CASCADE` in the schema, this also deletes all flashcards within the deck.

### 2.3. Flashcards (Management & CRUD)

#### **List Flashcards in Deck (Management)**
* **Method:** `GET`
* **URL:** `/rest/v1/flashcards?select=*&deck_id=eq.{uuid}&order=created_at.asc`
* **Description:** Fetches all flashcards belonging to a specific deck. Used for the "Deck Details" or "Edit Deck" view where users manage their content.
* **Response:** Array of Flashcard objects.

#### **Save Flashcards (Create)**
* **Method:** `POST`
* **URL:** `/rest/v1/flashcards`
* **Description:** Saves one or multiple flashcards (Bulk Insert). Used after approving cards in the Staging Area or manually adding a card.
* **Request Payload (Array):**
    ```json
    [
      {
        "deck_id": "deck_uuid",
        "front": "Front content",
        "back": "Back content",
        "creation_source": "AI"
      }
    ]
    ```

#### **Update Flashcard Content**
* **Method:** `PATCH`
* **URL:** `/rest/v1/flashcards?id=eq.{uuid}`
* **Description:** Updates the content of a flashcard (e.g., fixing typos).
* **Request Payload:**
    ```json
    { "front": "Updated Question", "back": "Updated Answer" }
    ```

#### **Delete Flashcard**
* **Method:** `DELETE`
* **URL:** `/rest/v1/flashcards?id=eq.{uuid}`
* **Description:** Permanently removes a single flashcard.

### 2.4. Study Logic (Review Queue)

#### **Fetch Study Queue**
* **Method:** `GET`
* **URL:** `/rest/v1/flashcards?select=*&next_review_date=lte.{now}&order=next_review_date.asc&limit=20`
* **Optional Filtering:** To study a specific deck, append `&deck_id=eq.{uuid}` to the query parameters.
* **Description:** Fetches flashcards due for review (where `next_review_date` <= current time). Returns a limited batch (e.g., 20) for mobile optimization.
* **Response:** Array of Flashcard objects to be studied.

#### **Process Review (SM-2 Algorithm)**
* **Method:** `POST`
* **URL:** `/functions/v1/process-review`
* **Description:** Astro API endpoint that processes a flashcard review using the open-source `supermemo` npm library.
* **Request Payload:**
    ```json
    {
      "card_id": "flashcard_uuid",
      "rating": "good"
    }
    ```
* **Rating Scale (UI → SM-2 Mapping):**
    The PRD defines 4 UI buttons which are mapped to the `supermemo` library's 0-5 quality scale:
    
    | UI Button | SM-2 Grade | Description |
    |-----------|------------|-------------|
    | **Again** | `1` | Complete blackout, wrong answer |
    | **Hard** | `3` | Correct but with significant difficulty |
    | **Good** | `4` | Correct with some hesitation |
    | **Easy** | `5` | Perfect, instant recall |
    
    *Note: Grades `0` (total blackout) and `2` (wrong but easy to recall) are not exposed in the UI for simplicity.*
* **Response Payload (Success 200):**
    ```json
    {
      "id": "flashcard_uuid",
      "repetition_number": 2,
      "easiness_factor": 2.5,
      "interval": 6,
      "next_review_date": "2026-01-20T00:00:00Z"
    }
    ```
* **Business Logic:**
    1.  Validates user owns the flashcard (via RLS).
    2.  Fetches current SM-2 state (`interval`, `repetition_number`, `easiness_factor`).
    3.  Calls `supermemo` library with current state and rating.
    4.  Updates flashcard with new SM-2 values and `next_review_date`.
    5.  Returns updated flashcard data.

### 2.5. Profiles & User Data

#### **Get User Profile & Quotas**
* **Method:** `GET`
* **URL:** `/rest/v1/profiles?select=generations_count,last_reset_date,last_generation_date`
* **Description:** Fetches current usage limits and statistics for the logged-in user. Used to disable/enable the "Generate AI" button on the UI.
* **Response:**
    ```json
    [
      {
        "generations_count": 5,
        "last_generation_date": "2023-10-27T15:00:00Z",
        "last_reset_date": "2023-10-27T10:00:00Z"
      }
    ]
    ```

---

## 3. Authentication and Authorization

* **Mechanism:** Supabase Auth (JWT).
* **Implementation:**
    * All requests must include the header: `Authorization: Bearer <access_token>`.
    * The token is generated upon login (`US-002`) or registration (`US-001`).
* **Row Level Security (RLS):**
    * The API relies entirely on RLS policies defined in the database.
    * For every query, the database checks if `auth.uid()` matches the `user_id` column on the target rows.
    * Users cannot read or modify data belonging to others.

---

## 4. Validation and Business Logic

### 4.1. Schema Constraints (Validation)
* **Flashcards:**
    * `front`: Max 200 chars (Required).
    * `back`: Max 500 chars (Required).
    * `deck_id`: Must exist and belong to the user (Referential Integrity + RLS).
    * `creation_source`: Must be one of enum values: `'AI'`, `'EditedAI'`, `'Manual'`.
* **Input Text (AI Generation):**
    * Text length: Max 5000 characters (Validated in Edge Function before sending to OpenAI).

### 4.2. Business Logic Implementation
* **Daily Generation Limit (10/day):**
    * Implemented as a database function (RPC) `check_and_reset_quota`.
    * **Atomic Operation:** It checks the last reset time, resets the counter if >24h have passed, and then checks if `count < 10`.
    * This prevents race conditions and ensures strict enforcement on the backend.
* **Staging Area Workflow:**
    * The Edge Function (`/generate-flashcards`) **does not save** to the database. It returns ephemeral JSON.
    * The user must explicitly verify and "Save" the cards, triggering the `POST /flashcards` endpoint. This fulfills the "User Verification" requirement.
* **Spaced Repetition (SM-2):**
    * Implemented using the open-source [`supermemo`](https://www.npmjs.com/package/supermemo) npm library for Node.js.
    * **Simplified Rating Scale:** The PRD specifies 4 user-facing buttons (Again, Hard, Good, Easy) which are mapped to the library's 6-grade scale (0-5). This simplification improves UX while maintaining algorithm effectiveness.
    * Logic is encapsulated in the `/functions/v1/process-review` endpoint. The client submits one of 4 ratings; the server maps it to SM-2 grade and calculates the next review date.
    * The library handles all SM-2 calculations (easiness factor, interval, repetition count), ensuring algorithm consistency without custom implementation.
    * Example usage in endpoint:
      ```typescript
      import { supermemo } from 'supermemo';
      
      // Map 4 UI buttons to SM-2 grades
      const gradeMap: Record<string, number> = {
        'again': 1,
        'hard': 3,
        'good': 4,
        'easy': 5
      };
      
      const result = supermemo(
        { interval: card.interval, repetition: card.repetition_number, efactor: card.easiness_factor },
        gradeMap[rating]
      );
      // result: { interval, repetition, efactor }
      ```