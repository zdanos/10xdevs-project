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
| **Reviews** | *RPC (Database Function)* | Logic for processing flashcard ratings (SM-2 algorithm). |

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
* **URL:** `/rest/v1/rpc/process_review`
* **Description:** Calls a stored procedure to calculate the next review interval based on user rating.
* **Request Payload:**
    ```json
    {
      "card_id": "flashcard_uuid",
      "rating": 3 // 1=Again, 2=Hard, 3=Good, 4=Easy
    }
    ```
* **Business Logic:** Updates `interval`, `repetition_number`, `easiness_factor`, and `next_review_date`.

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
    * Logic is encapsulated in the `process_review` RPC. The client does not calculate the next date; it only submits the rating. This ensures algorithm consistency.