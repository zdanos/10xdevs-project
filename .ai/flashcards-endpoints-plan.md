# API Endpoints Implementation Plan: Flashcards Management

## 1. Endpoints Overview

This implementation plan covers the CRUD operations for managing flashcards within decks. These endpoints enable users to create, read, update, and delete flashcards, supporting both individual operations and bulk insertions (crucial for AI-generated flashcard workflows).

**Core Functionality:**
- **List Flashcards**: Retrieve all flashcards belonging to a specific deck
- **Create Flashcards**: Save one or multiple flashcards (bulk insert support for AI-generated content)
- **Update Flashcard**: Modify the content (front/back text) of an existing flashcard
- **Delete Flashcard**: Permanently remove a single flashcard

**Technical Approach:**
- Follow existing project patterns from deck endpoints implementation
- Implement as Astro API routes in `src/pages/api/flashcards/`
- Extract business logic to service layer (`src/lib/services/flashcard.service.ts`)
- Use Zod for input validation (`src/lib/validators/flashcard.validator.ts`)
- Leverage Supabase RLS policies for authorization
- Support the staging area workflow (AI generation → User verification → Bulk save)

---

## 2. Requests Details

### 2.1. List Flashcards in Deck

**HTTP Method:** `GET`  
**Route Path:** `/api/flashcards`  
**File Location:** `src/pages/api/flashcards/index.ts`

**Query Parameters:**
- `deck_id` (required): UUID of the deck to fetch flashcards from

**Request Headers:**
- `Authorization: Bearer <access_token>` (required after auth implementation)

**Example Request:**
```http
GET /api/flashcards?deck_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

---

### 2.2. Create Flashcard(s)

**HTTP Method:** `POST`  
**Route Path:** `/api/flashcards`  
**File Location:** `src/pages/api/flashcards/index.ts`

**Request Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <access_token>` (required after auth implementation)

**Request Body (Single Flashcard):**
```json
{
  "deck_id": "550e8400-e29b-41d4-a716-446655440000",
  "front": "What is the capital of France?",
  "back": "Paris",
  "creation_source": "Manual"
}
```

**Request Body (Bulk Insert - Array):**
```json
[
  {
    "deck_id": "550e8400-e29b-41d4-a716-446655440000",
    "front": "Question 1",
    "back": "Answer 1",
    "creation_source": "AI",
    "generation_id": "gen-log-uuid"
  },
  {
    "deck_id": "550e8400-e29b-41d4-a716-446655440000",
    "front": "Question 2",
    "back": "Answer 2",
    "creation_source": "EditedAI",
    "generation_id": "gen-log-uuid"
  }
]
```

**Parameters:**
- **Required:**
  - `deck_id` (UUID): Target deck for the flashcard(s)
  - `front` (string, 1-200 chars): Question text
  - `back` (string, 1-500 chars): Answer text
  - `creation_source` (enum): One of `'AI'`, `'EditedAI'`, `'Manual'`
- **Optional:**
  - `generation_id` (UUID): Reference to generation_logs entry (for AI-generated cards)

**Bulk Insert Constraints:**
- Minimum: 1 flashcard
- Maximum: 50 flashcards per request (prevent abuse)
- All flashcards in a bulk request should belong to the same deck

---

### 2.3. Update Flashcard Content

**HTTP Method:** `PATCH`  
**Route Path:** `/api/flashcards/[id]`  
**File Location:** `src/pages/api/flashcards/[id].ts`

**URL Parameters:**
- `id` (required): UUID of the flashcard to update

**Request Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <access_token>` (required after auth implementation)

**Request Body:**
```json
{
  "front": "Updated question text",
  "back": "Updated answer text"
}
```

**Parameters:**
- **Required:** At least one of:
  - `front` (string, 1-200 chars): Updated question text
  - `back` (string, 1-500 chars): Updated answer text
- Both fields can be updated simultaneously

**Example Requests:**
```http
PATCH /api/flashcards/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{ "front": "What is the capital of Spain?" }
```

---

### 2.4. Delete Flashcard

**HTTP Method:** `DELETE`  
**Route Path:** `/api/flashcards/[id]`  
**File Location:** `src/pages/api/flashcards/[id].ts`

**URL Parameters:**
- `id` (required): UUID of the flashcard to delete

**Request Headers:**
- `Authorization: Bearer <access_token>` (required after auth implementation)

**Example Request:**
```http
DELETE /api/flashcards/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

---

## 3. Used Types

### 3.1. Existing Types (from `src/types.ts`)

**Entity Type:**
```typescript
FlashcardEntity = Tables<"flashcards">
```

**DTOs:**
```typescript
FlashcardDTO = FlashcardEntity
```

**Command Models:**
```typescript
CreateFlashcardCommand = Pick<TablesInsert<"flashcards">, 
  "deck_id" | "front" | "back" | "creation_source">

UpdateFlashcardCommand = {
  front?: string;
  back?: string;
}
```

### 3.2. New Types to Add to `src/types.ts`

```typescript
/**
 * Response type for listing flashcards in a deck
 * Used in: GET /api/flashcards
 */
export type ListFlashcardsResponseDTO = FlashcardDTO[];

/**
 * Command model for bulk flashcard creation
 * Used in: POST /api/flashcards (array payload)
 * 
 * Validates array length (1-50 items) to prevent abuse
 */
export type BulkCreateFlashcardsCommand = CreateFlashcardCommand[];
```

### 3.3. Validator Types (from `src/lib/validators/flashcard.validator.ts`)

To be created:

```typescript
// Zod schemas
export const createFlashcardSchema: z.ZodSchema<CreateFlashcardCommand>
export const bulkCreateFlashcardsSchema: z.ZodArray
export const updateFlashcardSchema: z.ZodObject
export const flashcardIdSchema: z.ZodString
export const deckIdQuerySchema: z.ZodString

// Inferred types
export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>
export type BulkCreateFlashcardsInput = z.infer<typeof bulkCreateFlashcardsSchema>
export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>
export type FlashcardIdInput = z.infer<typeof flashcardIdSchema>
export type DeckIdQueryInput = z.infer<typeof deckIdQuerySchema>
```

---

## 4. Responses Details

### 4.1. List Flashcards (GET)

**Success Response (200 OK):**
```json
[
  {
    "id": "flashcard-uuid-1",
    "deck_id": "deck-uuid",
    "user_id": "user-uuid",
    "front": "Question 1",
    "back": "Answer 1",
    "creation_source": "AI",
    "generation_id": "gen-log-uuid",
    "repetition_number": 0,
    "easiness_factor": 2.5,
    "interval": 0,
    "next_review_date": "2026-01-14T10:00:00Z",
    "created_at": "2026-01-14T10:00:00Z",
    "updated_at": "2026-01-14T10:00:00Z"
  },
  {
    "id": "flashcard-uuid-2",
    "deck_id": "deck-uuid",
    "user_id": "user-uuid",
    "front": "Question 2",
    "back": "Answer 2",
    "creation_source": "Manual",
    "generation_id": null,
    "repetition_number": 0,
    "easiness_factor": 2.5,
    "interval": 0,
    "next_review_date": "2026-01-14T10:00:00Z",
    "created_at": "2026-01-14T10:00:00Z",
    "updated_at": "2026-01-14T10:00:00Z"
  }
]
```

**Empty Result (200 OK):**
```json
[]
```

**Error Responses:**
- **400 Bad Request** - Invalid deck_id format
  ```json
  {
    "error": "Validation Error",
    "message": "Invalid deck ID format",
    "details": [
      {
        "field": "deck_id",
        "message": "Expected UUID format"
      }
    ]
  }
  ```

- **401 Unauthorized** - Missing or invalid token
  ```json
  {
    "error": "Unauthorized",
    "message": "Authentication required"
  }
  ```

- **500 Internal Server Error** - Database failure
  ```json
  {
    "error": "Internal Server Error",
    "message": "Failed to fetch flashcards"
  }
  ```

---

### 4.2. Create Flashcard(s) (POST)

**Success Response (201 Created) - Single:**
```json
{
  "id": "new-flashcard-uuid",
  "deck_id": "deck-uuid",
  "user_id": "user-uuid",
  "front": "Question",
  "back": "Answer",
  "creation_source": "Manual",
  "generation_id": null,
  "repetition_number": 0,
  "easiness_factor": 2.5,
  "interval": 0,
  "next_review_date": "2026-01-14T10:00:00Z",
  "created_at": "2026-01-14T10:00:00Z",
  "updated_at": "2026-01-14T10:00:00Z"
}
```

**Success Response (201 Created) - Bulk:**
```json
[
  {
    "id": "new-flashcard-uuid-1",
    "deck_id": "deck-uuid",
    "user_id": "user-uuid",
    "front": "Question 1",
    "back": "Answer 1",
    "creation_source": "AI",
    "generation_id": "gen-log-uuid",
    "repetition_number": 0,
    "easiness_factor": 2.5,
    "interval": 0,
    "next_review_date": "2026-01-14T10:00:00Z",
    "created_at": "2026-01-14T10:00:00Z",
    "updated_at": "2026-01-14T10:00:00Z"
  },
  {
    "id": "new-flashcard-uuid-2",
    "deck_id": "deck-uuid",
    "user_id": "user-uuid",
    "front": "Question 2",
    "back": "Answer 2",
    "creation_source": "AI",
    "generation_id": "gen-log-uuid",
    "repetition_number": 0,
    "easiness_factor": 2.5,
    "interval": 0,
    "next_review_date": "2026-01-14T10:00:00Z",
    "created_at": "2026-01-14T10:00:00Z",
    "updated_at": "2026-01-14T10:00:00Z"
  }
]
```

**Error Responses:**
- **400 Bad Request** - Validation error
  ```json
  {
    "error": "Validation Error",
    "message": "Front text must be 200 characters or less",
    "details": [
      {
        "field": "front",
        "message": "Front text must be 200 characters or less"
      }
    ]
  }
  ```

- **400 Bad Request** - Bulk size exceeded
  ```json
  {
    "error": "Validation Error",
    "message": "Cannot create more than 50 flashcards at once",
    "details": [
      {
        "field": "flashcards",
        "message": "Array must contain at most 50 element(s)"
      }
    ]
  }
  ```

- **404 Not Found** - Deck not found or access denied
  ```json
  {
    "error": "Not Found",
    "message": "Deck not found or access denied"
  }
  ```

- **500 Internal Server Error** - Database failure
  ```json
  {
    "error": "Internal Server Error",
    "message": "Failed to create flashcard(s)"
  }
  ```

---

### 4.3. Update Flashcard (PATCH)

**Success Response (200 OK):**
```json
{
  "id": "flashcard-uuid",
  "deck_id": "deck-uuid",
  "user_id": "user-uuid",
  "front": "Updated Question",
  "back": "Updated Answer",
  "creation_source": "EditedAI",
  "generation_id": "gen-log-uuid",
  "repetition_number": 0,
  "easiness_factor": 2.5,
  "interval": 0,
  "next_review_date": "2026-01-14T10:00:00Z",
  "created_at": "2026-01-14T10:00:00Z",
  "updated_at": "2026-01-14T10:05:00Z"
}
```

**Error Responses:**
- **400 Bad Request** - No fields provided
  ```json
  {
    "error": "Validation Error",
    "message": "At least one field (front or back) must be provided",
    "details": []
  }
  ```

- **400 Bad Request** - Validation error
  ```json
  {
    "error": "Validation Error",
    "message": "Back text must be 500 characters or less",
    "details": [
      {
        "field": "back",
        "message": "Back text must be 500 characters or less"
      }
    ]
  }
  ```

- **404 Not Found** - Flashcard not found or access denied
  ```json
  {
    "error": "Not Found",
    "message": "Flashcard not found or access denied"
  }
  ```

- **500 Internal Server Error** - Database failure
  ```json
  {
    "error": "Internal Server Error",
    "message": "Failed to update flashcard"
  }
  ```

---

### 4.4. Delete Flashcard (DELETE)

**Success Response (204 No Content):**
- Empty response body
- Status code indicates successful deletion

**Error Responses:**
- **400 Bad Request** - Invalid flashcard ID
  ```json
  {
    "error": "Validation Error",
    "message": "Invalid flashcard ID format",
    "details": [
      {
        "field": "id",
        "message": "Expected UUID format"
      }
    ]
  }
  ```

- **404 Not Found** - Flashcard not found or access denied
  ```json
  {
    "error": "Not Found",
    "message": "Flashcard not found or access denied"
  }
  ```

- **500 Internal Server Error** - Database failure
  ```json
  {
    "error": "Internal Server Error",
    "message": "Failed to delete flashcard"
  }
  ```

---

## 5. Data Flows

### 5.1. List Flashcards Flow

```
Client Request (GET /api/flashcards?deck_id=xxx)
  ↓
API Route (index.ts)
  ↓ [1. Extract & validate deck_id query param]
  ↓
Validator (deckIdQuerySchema)
  ↓ [2. Validate UUID format]
  ↓
Service Layer (flashcard.service.ts)
  ↓ [3. Call listDeckFlashcards(supabase, deckId)]
  ↓
Supabase Client
  ↓ [4. Query: SELECT * FROM flashcards WHERE deck_id = $1 AND user_id = auth.uid() ORDER BY created_at ASC]
  ↓ [5. RLS Policy enforces user_id = auth.uid()]
  ↓
Database Response
  ↓ [6. Return FlashcardEntity[] or empty array]
  ↓
Service Layer
  ↓ [7. Map to FlashcardDTO[] (no transformation needed)]
  ↓
API Route
  ↓ [8. Return 200 with JSON response]
  ↓
Client Response (Array of flashcards)
```

**Key Steps:**
1. Extract deck_id from query parameters
2. Validate UUID format using Zod schema
3. Pass to service layer with authenticated Supabase client
4. Service builds query with order by created_at ascending
5. RLS automatically filters by user_id = auth.uid()
6. Return all matching flashcards or empty array
7. No transformation needed (FlashcardDTO = FlashcardEntity)
8. Return success response with 200 status

---

### 5.2. Create Flashcard(s) Flow

```
Client Request (POST /api/flashcards)
  ↓
API Route (index.ts)
  ↓ [1. Parse request body as JSON]
  ↓ [2. Detect single vs. bulk (check if array)]
  ↓
Validator (flashcard.validator.ts)
  ↓ [3. Apply appropriate schema (single/bulk)]
  ↓ [4. Validate: deck_id, front (1-200), back (1-500), creation_source, array size (1-50)]
  ↓
Service Layer (flashcard.service.ts)
  ↓ [5. Call createFlashcards(supabase, commands, userId)]
  ↓ [6. Normalize input to array format]
  ↓
Supabase Client
  ↓ [7. INSERT INTO flashcards (deck_id, user_id, front, back, creation_source, generation_id) VALUES ...]
  ↓ [8. FK constraint validates deck_id exists and belongs to user]
  ↓ [9. RLS policy enforces user_id = auth.uid()]
  ↓
Database Response
  ↓ [10. Return created FlashcardEntity[] with auto-generated fields]
  ↓
Service Layer
  ↓ [11. Return single object if input was single, array if bulk]
  ↓
API Route
  ↓ [12. Return 201 with JSON response]
  ↓
Client Response (Created flashcard(s))
```

**Key Steps:**
1. Parse request body (handle JSON parsing errors)
2. Detect single object vs. array to apply correct validation
3. Apply appropriate Zod schema (createFlashcardSchema or bulkCreateFlashcardsSchema)
4. Validate all required fields, length constraints, and bulk size limit
5. Pass to service layer with authenticated Supabase client
6. Service normalizes input to array for consistent processing
7. Bulk insert using Supabase client (single query for efficiency)
8. Database validates FK constraint (deck_id must exist and belong to user)
9. RLS policy automatically sets user_id = auth.uid()
10. Database returns all created records with auto-generated IDs and timestamps
11. Service returns format matching input (single vs. array)
12. Return 201 Created status with response data

**Special Considerations:**
- **Deck Ownership:** FK constraint + RLS ensures deck belongs to user. If not, returns 404 (not 403 to avoid information disclosure)
- **Bulk Insert Optimization:** Single database query for all flashcards (Supabase supports array insert)
- **User ID:** Service receives user_id from authenticated context (currently DEFAULT_USER_ID for testing)
- **Generation ID:** Optional field, only used for AI-generated cards to track acceptance rate metrics

---

### 5.3. Update Flashcard Flow

```
Client Request (PATCH /api/flashcards/[id])
  ↓
API Route ([id].ts)
  ↓ [1. Extract id from URL params]
  ↓ [2. Parse request body as JSON]
  ↓
Validator (flashcard.validator.ts)
  ↓ [3. Validate id as UUID]
  ↓ [4. Validate body: at least one of front/back, length constraints]
  ↓
Service Layer (flashcard.service.ts)
  ↓ [5. Call updateFlashcard(supabase, id, command)]
  ↓
Supabase Client
  ↓ [6. UPDATE flashcards SET front = $1, back = $2, updated_at = NOW() WHERE id = $3 AND user_id = auth.uid()]
  ↓ [7. RLS policy enforces user_id = auth.uid()]
  ↓ [8. Trigger updates updated_at timestamp]
  ↓
Database Response
  ↓ [9. Return updated FlashcardEntity or null if not found]
  ↓
Service Layer
  ↓ [10. If null, throw FlashcardServiceError]
  ↓ [11. Return updated FlashcardDTO]
  ↓
API Route
  ↓ [12. Return 200 with JSON response]
  ↓
Client Response (Updated flashcard)
```

**Key Steps:**
1. Extract flashcard ID from URL parameters
2. Parse request body (handle JSON parsing errors)
3. Validate ID is valid UUID format
4. Validate at least one field is provided and meets length constraints
5. Pass to service layer with authenticated Supabase client
6. Service builds UPDATE query with provided fields only
7. RLS policy ensures only owner can update
8. Database trigger automatically updates updated_at timestamp
9. Database returns updated record or null if not found/not authorized
10. Service throws error if no data returned (404 scenario)
11. Return updated flashcard as DTO
12. Return 200 OK status with response data

**Special Considerations:**
- **Partial Updates:** Only fields provided in request body are updated
- **At Least One Field:** Validation ensures either front or back (or both) is provided
- **Updated At:** Automatically set by database trigger (handle_updated_at)
- **404 vs 403:** Return 404 for not found OR unauthorized to avoid information disclosure

---

### 5.4. Delete Flashcard Flow

```
Client Request (DELETE /api/flashcards/[id])
  ↓
API Route ([id].ts)
  ↓ [1. Extract id from URL params]
  ↓
Validator (flashcard.validator.ts)
  ↓ [2. Validate id as UUID]
  ↓
Service Layer (flashcard.service.ts)
  ↓ [3. Call deleteFlashcard(supabase, id)]
  ↓
Supabase Client
  ↓ [4. DELETE FROM flashcards WHERE id = $1 AND user_id = auth.uid()]
  ↓ [5. RLS policy enforces user_id = auth.uid()]
  ↓ [6. Return affected row count]
  ↓
Database Response
  ↓ [7. Return count (0 or 1)]
  ↓
Service Layer
  ↓ [8. If count = 0, throw FlashcardServiceError]
  ↓ [9. Return void on success]
  ↓
API Route
  ↓ [10. Return 204 No Content]
  ↓
Client Response (Empty body, 204 status)
```

**Key Steps:**
1. Extract flashcard ID from URL parameters
2. Validate ID is valid UUID format
3. Pass to service layer with authenticated Supabase client
4. Service executes DELETE with count tracking
5. RLS policy ensures only owner can delete
6. Database returns number of affected rows
7. Check if any rows were deleted
8. Service throws error if count is 0 (not found or unauthorized)
9. Return void on successful deletion
10. Return 204 No Content (standard for successful DELETE with no response body)

**Special Considerations:**
- **Count Tracking:** Use `{ count: 'exact' }` option to verify deletion occurred
- **404 vs 403:** Return 404 for not found OR unauthorized to avoid information disclosure
- **No Response Body:** 204 status code indicates success without content
- **Cascade Effects:** None (flashcards don't have dependent records in other tables)

---

## 6. Security Considerations

### 6.1. Authentication

**Mechanism:** Supabase Auth (JWT)
- All requests must include `Authorization: Bearer <access_token>` header
- Token is verified by Supabase middleware
- `auth.uid()` is extracted from JWT and used in RLS policies

**Current Implementation:**
- Using `DEFAULT_USER_ID` constant for testing (before auth implementation)
- After auth implementation:
  - Replace `supabaseClient` with `context.locals.supabase` (authenticated client)
  - User ID will be automatically available via `auth.uid()` in RLS policies
  - No need to pass user_id explicitly in service calls

### 6.2. Authorization (Row Level Security)

**RLS Policies on `flashcards` table:**
- **SELECT:** `user_id = auth.uid()`
- **INSERT:** `user_id = auth.uid()`
- **UPDATE:** `user_id = auth.uid()`
- **DELETE:** `user_id = auth.uid()`

**Additional Authorization through Foreign Keys:**
- `deck_id` FK constraint ensures deck exists
- RLS on `decks` table ensures deck belongs to user
- Combined effect: Users can only create flashcards in their own decks

**Information Disclosure Prevention:**
- Return 404 (not 403) when resource not found or access denied
- Prevents attackers from enumerating valid UUIDs

### 6.3. Input Validation

**Server-Side Validation (Critical):**
- **Never trust client input**
- Use Zod schemas for all inputs:
  - Type validation (string, UUID, enum)
  - Length constraints (front: 1-200, back: 1-500)
  - Required field checks
  - Array size limits (bulk insert: 1-50)
- Trim whitespace to prevent empty strings
- Validate UUIDs to prevent malformed queries

**Database-Level Constraints (Last Line of Defense):**
- `NOT NULL` constraints
- `VARCHAR` length limits
- `CHECK` constraints for enums (card_source_type)
- Foreign key constraints

### 6.4. Threat Mitigation

**1. SQL Injection:**
- **Threat:** Malicious SQL in UUID or text fields
- **Mitigation:** Supabase client uses parameterized queries; Zod validates UUID format

**2. XSS (Cross-Site Scripting):**
- **Threat:** Malicious scripts in front/back text
- **Mitigation:** Length limits reduce attack surface; frontend must sanitize on display

**3. Bulk Insert Abuse:**
- **Threat:** User creates thousands of flashcards to fill database
- **Mitigation:** Limit to 50 cards per request; consider rate limiting at API gateway

**4. Deck Ownership Bypass:**
- **Threat:** Creating flashcards for other users' decks
- **Mitigation:** FK constraint + RLS on decks table; returns 404 if deck not owned

**5. Resource Enumeration:**
- **Threat:** Discovering valid UUIDs through error messages
- **Mitigation:** Return 404 (not 403) for unauthorized access; generic error messages

**6. Mass Assignment:**
- **Threat:** Setting protected fields (id, user_id, created_at)
- **Mitigation:** Use command models that only expose settable fields; database defaults handle rest

**7. Race Conditions:**
- **Threat:** Concurrent updates causing data inconsistency
- **Mitigation:** Database handles concurrency; updated_at trigger ensures consistency

### 6.5. Data Sanitization

**Input Sanitization:**
- Trim leading/trailing whitespace from front and back text
- Validate against maximum lengths before database insertion
- Reject empty strings (minimum 1 character after trim)

**Output Sanitization:**
- No sensitive data exposed in API responses (user_id is included but not sensitive)
- Error messages don't leak database structure or internal implementation details

---

## 7. Error Handling

### 7.1. Error Handling Strategy

**Principles:**
- Handle errors at the beginning of functions (early returns)
- Use guard clauses for preconditions
- Avoid deeply nested try-catch blocks
- Log all errors with structured context
- Return user-friendly error messages
- Avoid exposing internal implementation details

### 7.2. Error Types and HTTP Status Codes

**400 Bad Request:**
- Invalid JSON in request body
- Validation errors (missing required fields, length violations)
- Invalid UUID format
- Empty update payload (no fields provided)
- Bulk insert array too large (> 50) or empty

**401 Unauthorized:**
- Missing Authorization header
- Invalid or expired JWT token
- Token signature verification failure

**404 Not Found:**
- Flashcard not found
- Deck not found (when creating flashcard)
- Resource exists but user doesn't own it (to prevent information disclosure)

**500 Internal Server Error:**
- Database connection failure
- Unexpected database errors
- Supabase client errors
- Unhandled exceptions in service layer

### 7.3. Error Response Format

**Consistent Error Structure:**
```typescript
interface ErrorResponse {
  error: string;        // Error category (e.g., "Validation Error")
  message: string;      // User-friendly message
  details?: Array<{     // Optional field-level details
    field: string;
    message: string;
  }>;
}
```

**Examples:**

**Validation Error:**
```json
{
  "error": "Validation Error",
  "message": "Front text must be 200 characters or less",
  "details": [
    {
      "field": "front",
      "message": "Front text must be 200 characters or less"
    }
  ]
}
```

**Generic Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to create flashcard(s)"
}
```

**Not Found Error:**
```json
{
  "error": "Not Found",
  "message": "Flashcard not found or access denied"
}
```

### 7.4. Logging Strategy

**Log Levels:**
- **Error:** All database errors, unexpected exceptions
- **Info:** Successful operations (optional, for monitoring)
- **Debug:** Request/response data (development only)

**Log Format:**
```typescript
console.error("[Context] Error description:", {
  error: error.message,
  code: error.code,          // Database error code
  details: error.details,    // Database error details
  context: {                 // Operation-specific context
    flashcardId: id,
    deckId: deckId,
    userId: userId,
    // ... other relevant context
  },
  timestamp: new Date().toISOString()
});
```

**Log Examples:**

**Service Layer Error:**
```typescript
console.error("[FlashcardService] Database error during createFlashcards:", {
  error: error.message,
  code: error.code,
  details: error.details,
  command: commands,
  userId: userId,
  timestamp: new Date().toISOString(),
});
```

**API Layer Error:**
```typescript
console.error("[API /api/flashcards POST] Request failed:", {
  error: error instanceof Error ? error.message : "Unknown error",
  body: request.body,
  timestamp: new Date().toISOString(),
});
```

**Unexpected Error:**
```typescript
console.error("[FlashcardService] Unexpected error in deleteFlashcard:", {
  error: error instanceof Error ? error.message : "Unknown error",
  flashcardId: id,
  timestamp: new Date().toISOString(),
});
```

### 7.5. Service Layer Error Handling

**Custom Error Class:**
```typescript
export class FlashcardServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlashcardServiceError";
  }
}
```

**Error Handling Pattern:**
```typescript
export async function createFlashcards(...) {
  try {
    // Database operation
    const { data, error } = await supabase...;
    
    if (error) {
      // Log database error with full context
      console.error("[FlashcardService] Database error:", {...});
      throw new FlashcardServiceError("Failed to create flashcard(s)");
    }
    
    if (!data) {
      // Log unexpected null data
      console.error("[FlashcardService] No data returned:", {...});
      throw new FlashcardServiceError("Failed to create flashcard(s): No data returned");
    }
    
    return data;
  } catch (error) {
    // Re-throw known error types
    if (error instanceof FlashcardServiceError) {
      throw error;
    }
    
    // Handle unexpected errors
    console.error("[FlashcardService] Unexpected error:", {...});
    throw new FlashcardServiceError("Failed to create flashcard(s) due to an unexpected error");
  }
}
```

### 7.6. API Route Error Handling

**Pattern for All Endpoints:**
```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({
        error: "Bad Request",
        message: "Invalid JSON in request body",
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    
    // 2. Validate input
    const validationResult = schema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return new Response(JSON.stringify({
        error: "Validation Error",
        message: firstError.message,
        details: validationResult.error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
        })),
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    
    // 3. Call service layer
    const result = await serviceFunction(supabase, validationResult.data);
    
    // 4. Return success response
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 5. Handle service layer errors
    console.error("[API Endpoint] Request failed:", {...});
    
    // Map service errors to appropriate status codes
    if (error instanceof FlashcardServiceError) {
      // Check error message to determine status code
      if (error.message.includes("not found") || error.message.includes("access denied")) {
        return new Response(JSON.stringify({
          error: "Not Found",
          message: error.message,
        }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
    }
    
    // Default to 500 for unknown errors
    return new Response(JSON.stringify({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
```

### 7.7. Database Error Mapping

**Common Supabase Error Codes:**
- `23503` - Foreign key violation (deck_id doesn't exist or not owned)
  - Map to: 404 Not Found
  - Message: "Deck not found or access denied"

- `23505` - Unique constraint violation (shouldn't occur for flashcards)
  - Map to: 409 Conflict

- `42501` - Insufficient privileges (RLS policy rejection)
  - Map to: 404 Not Found (not 403 to prevent information disclosure)
  - Message: "Resource not found or access denied"

- `PGRST116` - Row not found (update/delete of non-existent resource)
  - Map to: 404 Not Found

### 7.8. Validation Error Details

**Provide Field-Level Feedback:**
- Extract all validation errors from Zod result
- Map to consistent structure with field path and message
- Return first error as main message, all errors in details array

**Example Zod Error Handling:**
```typescript
const validationResult = schema.safeParse(body);

if (!validationResult.success) {
  const errors = validationResult.error.errors;
  return new Response(JSON.stringify({
    error: "Validation Error",
    message: errors[0].message,  // First error as main message
    details: errors.map(err => ({
      field: err.path.join("."),  // e.g., "flashcards.0.front"
      message: err.message,
    })),
  }), { status: 400, headers: { "Content-Type": "application/json" } });
}
```

---

## 8. Performance Considerations

### 8.1. Database Query Optimization

**Indexes (Already Defined in Schema):**
- `flashcards_deck_id_idx` - Speeds up queries filtering by deck_id
- `flashcards_study_idx` (user_id, deck_id, next_review_date) - Composite index for study queue queries

**Query Optimization:**
- **List Flashcards:** Use indexed deck_id filter with ORDER BY created_at
- **Bulk Insert:** Single INSERT query with multiple values (not multiple queries)
- **Update/Delete:** Use primary key (id) for direct lookup

**N+1 Query Prevention:**
- All flashcard queries fetch data in single query
- No need for joins in basic CRUD operations
- Future: Consider using `select` parameter to fetch only needed fields

### 8.2. Bulk Operations

**Bulk Insert Optimization:**
- Accept array of flashcards in single request
- Use Supabase bulk insert (single database transaction)
- Limit to 50 cards per request (balance between efficiency and resource usage)

**Benefits:**
- Reduces HTTP request overhead
- Single database transaction (atomic)
- Faster than individual POST requests
- Critical for AI-generated flashcard workflow

**Implementation:**
```typescript
// Single query for multiple flashcards
const { data, error } = await supabase
  .from("flashcards")
  .insert(commands)  // Array of command objects
  .select();
```

### 8.3. Response Payload Optimization

**Current Implementation:**
- Return full FlashcardEntity (all fields)
- Acceptable for MVP with limited fields

**Future Optimizations:**
- Use Supabase `select` parameter to fetch only needed fields
- Example: `select=id,front,back,creation_source` for management view
- Example: `select=id,front,back,next_review_date` for study queue

### 8.4. Database Connection Pooling

**Supabase Handles:**
- Connection pooling managed by Supabase infrastructure
- No need to implement custom pooling
- PgBouncer in transaction mode for efficient connection reuse

**Best Practices:**
- Don't create multiple Supabase client instances
- Reuse authenticated client from context.locals
- Close requests properly to release connections

---

## 9. Implementation Steps

### Step 1: Update Type Definitions

**File:** `src/types.ts`

**Tasks:**
1. Add new type aliases for flashcards responses:
   ```typescript
   export type ListFlashcardsResponseDTO = FlashcardDTO[];
   export type BulkCreateFlashcardsCommand = CreateFlashcardCommand[];
   ```

**Acceptance Criteria:**
- Types compile without errors
- Types are exported and available for import

---

### Step 2: Create Validation Schemas

**File:** `src/lib/validators/flashcard.validator.ts` (new file)

**Tasks:**
1. Create validation schema for listing flashcards:
   ```typescript
   export const deckIdQuerySchema = z.string().uuid("Invalid deck ID format");
   ```

2. Create validation schema for creating a single flashcard:
   ```typescript
   export const createFlashcardSchema = z.object({
     deck_id: z.string().uuid("Invalid deck ID format"),
     front: z.string()
       .trim()
       .min(1, "Front text cannot be empty")
       .max(200, "Front text must be 200 characters or less"),
     back: z.string()
       .trim()
       .min(1, "Back text cannot be empty")
       .max(500, "Back text must be 500 characters or less"),
     creation_source: z.enum(["AI", "EditedAI", "Manual"], {
       errorMap: () => ({ message: "Creation source must be AI, EditedAI, or Manual" })
     }),
     generation_id: z.string().uuid("Invalid generation ID format").optional(),
   });
   ```

3. Create validation schema for bulk flashcard creation:
   ```typescript
   export const bulkCreateFlashcardsSchema = z.array(createFlashcardSchema)
     .min(1, "At least one flashcard must be provided")
     .max(50, "Cannot create more than 50 flashcards at once");
   ```

4. Create validation schema for updating a flashcard:
   ```typescript
   export const updateFlashcardSchema = z.object({
     front: z.string()
       .trim()
       .min(1, "Front text cannot be empty")
       .max(200, "Front text must be 200 characters or less")
       .optional(),
     back: z.string()
       .trim()
       .min(1, "Back text cannot be empty")
       .max(500, "Back text must be 500 characters or less")
       .optional(),
   }).refine(
     (data) => data.front !== undefined || data.back !== undefined,
     { message: "At least one field (front or back) must be provided" }
   );
   ```

5. Create validation schema for flashcard ID:
   ```typescript
   export const flashcardIdSchema = z.string().uuid("Invalid flashcard ID format");
   ```

6. Export inferred types:
   ```typescript
   export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;
   export type BulkCreateFlashcardsInput = z.infer<typeof bulkCreateFlashcardsSchema>;
   export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>;
   export type FlashcardIdInput = z.infer<typeof flashcardIdSchema>;
   export type DeckIdQueryInput = z.infer<typeof deckIdQuerySchema>;
   ```

**Acceptance Criteria:**
- All schemas validate correct input
- All schemas reject invalid input with appropriate error messages
- Type inference works correctly
- Schemas follow project validation patterns from deck.validator.ts

---

### Step 3: Create Service Layer

**File:** `src/lib/services/flashcard.service.ts` (new file)

**Tasks:**
1. Create custom error class:
   ```typescript
   export class FlashcardServiceError extends Error {
     constructor(message: string) {
       super(message);
       this.name = "FlashcardServiceError";
     }
   }
   ```

2. Implement `listDeckFlashcards` function:
   - Accept supabase client and deckId as parameters
   - Query flashcards table with deck_id filter
   - Order by created_at ascending
   - Return array of FlashcardDTO (or empty array)
   - Handle and log errors appropriately
   - Throw FlashcardServiceError on failure

3. Implement `createFlashcards` function:
   - Accept supabase client, commands (single or array), and userId
   - Normalize input to array format
   - Add user_id to each command object
   - Perform bulk insert using Supabase client
   - Return created flashcard(s) matching input format (single vs array)
   - Handle FK constraint errors (map to "Deck not found or access denied")
   - Handle and log errors appropriately
   - Throw FlashcardServiceError on failure

4. Implement `updateFlashcard` function:
   - Accept supabase client, flashcard id, and update command
   - Build update query with only provided fields
   - Update with WHERE id = $id
   - Return updated FlashcardDTO
   - Handle "no data returned" case (throw "not found or access denied")
   - Handle and log errors appropriately
   - Throw FlashcardServiceError on failure

5. Implement `deleteFlashcard` function:
   - Accept supabase client and flashcard id
   - Delete with count tracking
   - Check if count = 0 (not found or unauthorized)
   - Return void on success
   - Throw FlashcardServiceError if not found
   - Handle and log errors appropriately

6. Add comprehensive error logging to all functions following deck.service.ts pattern

**Acceptance Criteria:**
- All functions follow async/await pattern
- All functions use proper TypeScript types from types.ts
- Error handling follows early return pattern
- All database errors are logged with structured context
- Service functions throw FlashcardServiceError for API layer to handle
- Code follows project coding practices from shared.mdc

---

### Step 4: Create API Route for Listing and Creating Flashcards

**File:** `src/pages/api/flashcards/index.ts` (new file)

**Tasks:**
1. Add file header with `export const prerender = false`

2. Implement GET handler for listing flashcards:
   - Extract deck_id from query parameters
   - Validate deck_id using deckIdQuerySchema
   - Call listDeckFlashcards service function
   - Return 200 with flashcard array
   - Handle validation errors (400)
   - Handle service errors (500)
   - Follow error handling pattern from decks/index.ts

3. Implement POST handler for creating flashcard(s):
   - Parse request body as JSON (handle parse errors)
   - Detect if body is array or single object
   - Apply appropriate validation schema (bulk vs single)
   - Call createFlashcards service function
   - Return 201 with created flashcard(s)
   - Handle validation errors (400)
   - Handle FK constraint errors (404 - "Deck not found or access denied")
   - Handle service errors (500)
   - Follow error handling pattern from decks/index.ts

4. Use consistent error response format matching deck endpoints

5. Add comprehensive error logging at API layer

**Acceptance Criteria:**
- GET endpoint returns array of flashcards for valid deck_id
- GET endpoint returns empty array if no flashcards exist
- GET endpoint validates deck_id and returns 400 for invalid format
- POST endpoint creates single flashcard from object payload
- POST endpoint creates multiple flashcards from array payload
- POST endpoint validates input and returns 400 with field-level details
- POST endpoint returns 404 if deck doesn't exist or isn't owned by user
- Both endpoints return consistent error response format
- Code follows Astro API route patterns from astro.mdc

---

### Step 5: Create API Route for Updating and Deleting Flashcards

**File:** `src/pages/api/flashcards/[id].ts` (new file)

**Tasks:**
1. Add file header with `export const prerender = false`

2. Implement PATCH handler for updating flashcard:
   - Extract id from params
   - Validate id using flashcardIdSchema
   - Parse request body as JSON (handle parse errors)
   - Validate body using updateFlashcardSchema
   - Call updateFlashcard service function
   - Return 200 with updated flashcard
   - Handle validation errors (400)
   - Handle "not found or access denied" errors (404)
   - Handle service errors (500)
   - Follow error handling pattern from decks/[id].ts

3. Implement DELETE handler for deleting flashcard:
   - Extract id from params
   - Validate id using flashcardIdSchema
   - Call deleteFlashcard service function
   - Return 204 No Content on success
   - Handle validation errors (400)
   - Handle "not found or access denied" errors (404)
   - Handle service errors (500)
   - Follow error handling pattern from decks/[id].ts

4. Use consistent error response format matching deck endpoints

5. Add comprehensive error logging at API layer

**Acceptance Criteria:**
- PATCH endpoint updates flashcard and returns updated data
- PATCH endpoint accepts partial updates (only front, only back, or both)
- PATCH endpoint validates that at least one field is provided
- PATCH endpoint returns 404 if flashcard not found or not owned
- DELETE endpoint deletes flashcard and returns 204
- DELETE endpoint returns 404 if flashcard not found or not owned
- Both endpoints validate UUID format and return 400 for invalid IDs
- Both endpoints return consistent error response format
- Code follows Astro API route patterns from astro.mdc

---

### Step 6: Test API Endpoints

**Testing Strategy:**

**Manual Testing with curl or Postman:**

1. **Test GET /api/flashcards?deck_id={uuid}:**
   - Valid deck_id with flashcards → 200 with array
   - Valid deck_id with no flashcards → 200 with empty array
   - Invalid deck_id format → 400 with validation error
   - Deck owned by another user → 200 with empty array (RLS filtering)

2. **Test POST /api/flashcards (Single):**
   - Valid payload → 201 with created flashcard
   - Missing required fields → 400 with validation error
   - Front text > 200 chars → 400 with validation error
   - Back text > 500 chars → 400 with validation error
   - Invalid deck_id → 404 with "Deck not found or access denied"
   - Invalid creation_source → 400 with validation error

3. **Test POST /api/flashcards (Bulk):**
   - Array of 5 valid flashcards → 201 with array of created flashcards
   - Array with 51 flashcards → 400 with "Cannot create more than 50"
   - Empty array → 400 with "At least one flashcard must be provided"
   - Array with one invalid item → 400 with field-level details
   - All flashcards in array → single database transaction (verify in logs)

4. **Test PATCH /api/flashcards/[id]:**
   - Update only front → 200 with updated flashcard
   - Update only back → 200 with updated flashcard
   - Update both front and back → 200 with updated flashcard
   - Empty body (no fields) → 400 with "At least one field must be provided"
   - Invalid flashcard_id format → 400 with validation error
   - Non-existent flashcard_id → 404
   - Flashcard owned by another user → 404

5. **Test DELETE /api/flashcards/[id]:**
   - Valid flashcard_id → 204 with no content
   - Invalid flashcard_id format → 400 with validation error
   - Non-existent flashcard_id → 404
   - Flashcard owned by another user → 404

**Acceptance Criteria:**
- All endpoints return correct status codes
- All endpoints return consistent error format
- Validation errors include field-level details
- RLS policies properly filter data by user
- Bulk insert creates all flashcards in single transaction
- Updated_at timestamp updates automatically on PATCH
- Error logs include structured context with timestamps

---

### Step 7: Integration with Existing System

**Tasks:**

1. **Verify Database Schema:**
   - Ensure flashcards table exists with correct columns
   - Verify RLS policies are enabled on flashcards table
   - Test that user_id is automatically set via RLS

2. **Verify Relationships:**
   - Test FK constraint: Creating flashcard with invalid deck_id fails
   - Test CASCADE: Deleting a deck deletes all its flashcards

3. **Update Authentication Flow (after auth implementation):**
   - Replace `supabaseClient` with `context.locals.supabase`
   - Remove `DEFAULT_USER_ID` usage
   - Verify JWT token extraction works correctly
   - Test unauthorized requests return 401

4. **Integration with AI Generation Flow:**
   - Test POST /api/flashcards with creation_source="AI" and generation_id
   - Verify generation_id FK relationship (optional, can be null)
   - Test bulk insert with AI-generated flashcards from staging area

5. **Integration with Study Mode (future):**
   - Ensure flashcards have correct SM-2 default values
   - Verify next_review_date defaults to NOW() (available for immediate study)

**Acceptance Criteria:**
- Flashcards endpoints work with existing deck endpoints
- RLS policies enforce user isolation correctly
- FK constraints prevent invalid data
- CASCADE delete works properly
- All endpoints ready for authentication integration
- AI-generated flashcards can be saved via bulk insert

---

### Step 8: Documentation and Cleanup

**Tasks:**

1. **Code Documentation:**
   - Add JSDoc comments to all service functions
   - Document parameters, return types, and error conditions
   - Add usage examples in comments
   - Follow documentation style from deck.service.ts

2. **API Documentation:**
   - Add inline comments explaining complex validation logic
   - Document error codes and their meanings
   - Add comments for any non-obvious business logic

3. **Update Project Documentation:**
   - Update shared.mdc if directory structure changed
   - Document new service and validator files

4. **Code Review Checklist:**
   - All functions use TypeScript types correctly
   - Error handling follows early return pattern
   - All database errors are logged with context
   - No console.log statements (use console.error for errors)
   - Code follows project style guide
   - No hardcoded values (use constants)
   - All user input is validated
   - All errors return appropriate status codes

5. **Cleanup:**
   - Remove any debug code or comments
   - Remove unused imports
   - Format code consistently
   - Run linter and fix any issues

**Acceptance Criteria:**
- All code is well-documented with JSDoc comments
- Code passes linter without errors or warnings
- No debug code or console.log statements remain
- Project documentation is up to date
- Code review checklist is completed

---

## Appendix A: File Structure

```
src/
├── types.ts                                    [UPDATE - Add new types]
├── lib/
│   ├── services/
│   │   ├── deck.service.ts                     [EXISTING]
│   │   └── flashcard.service.ts                [CREATE NEW]
│   └── validators/
│       ├── deck.validator.ts                   [EXISTING]
│       └── flashcard.validator.ts              [CREATE NEW]
├── pages/
│   └── api/
│       ├── decks/
│       │   ├── index.ts                        [EXISTING]
│       │   └── [id].ts                         [EXISTING]
│       └── flashcards/
│           ├── index.ts                        [CREATE NEW]
│           └── [id].ts                         [CREATE NEW]
└── db/
    ├── database.types.ts                       [EXISTING]
    └── supabase.client.ts                      [EXISTING]
```

---

## Appendix B: Database Schema Reference

**Table: flashcards**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique flashcard identifier |
| deck_id | UUID | FK -> decks.id, NOT NULL, ON DELETE CASCADE | Parent deck |
| user_id | UUID | FK -> profiles.id, NOT NULL | Owner (denormalized for RLS) |
| front | VARCHAR(200) | NOT NULL | Question text |
| back | VARCHAR(500) | NOT NULL | Answer text |
| creation_source | card_source_type | NOT NULL, DEFAULT 'Manual' | Source: AI/EditedAI/Manual |
| generation_id | UUID | FK -> generation_logs.id, NULLABLE, ON DELETE SET NULL | Generation log reference |
| repetition_number | INTEGER | DEFAULT 0, NOT NULL | SM-2: Repetition count |
| easiness_factor | FLOAT | DEFAULT 2.5, NOT NULL | SM-2: Easiness factor |
| interval | INTEGER | DEFAULT 0, NOT NULL | SM-2: Interval in days |
| next_review_date | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Next review date |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Last update timestamp |

**Indexes:**
- `flashcards_deck_id_idx` ON (deck_id)
- `flashcards_study_idx` ON (user_id, deck_id, next_review_date)

**RLS Policies:**
- All operations: `user_id = auth.uid()`

**Enum: card_source_type**
- Values: 'AI', 'EditedAI', 'Manual'

---

## Appendix C: Example Service Implementation

**Example: createFlashcards function**

```typescript
export async function createFlashcards(
  supabase: SupabaseClient<Database>,
  commands: CreateFlashcardCommand | CreateFlashcardCommand[],
  userId: string
): Promise<FlashcardDTO | FlashcardDTO[]> {
  const isSingle = !Array.isArray(commands);
  const commandsArray = Array.isArray(commands) ? commands : [commands];

  try {
    // Add user_id to each command
    const commandsWithUserId = commandsArray.map(cmd => ({
      ...cmd,
      user_id: userId,
    }));

    const { data, error } = await supabase
      .from("flashcards")
      .insert(commandsWithUserId)
      .select();

    if (error) {
      console.error("[FlashcardService] Database error during createFlashcards:", {
        error: error.message,
        code: error.code,
        details: error.details,
        commands: commandsArray,
        userId,
        timestamp: new Date().toISOString(),
      });

      // Map FK constraint error to user-friendly message
      if (error.code === "23503") {
        throw new FlashcardServiceError("Deck not found or access denied");
      }

      throw new FlashcardServiceError("Failed to create flashcard(s)");
    }

    if (!data || data.length === 0) {
      console.error("[FlashcardService] No data returned from createFlashcards:", {
        commands: commandsArray,
        userId,
        timestamp: new Date().toISOString(),
      });
      throw new FlashcardServiceError("Failed to create flashcard(s): No data returned");
    }

    // Return format matching input (single vs array)
    return isSingle ? data[0] : data;
  } catch (error) {
    if (error instanceof FlashcardServiceError) {
      throw error;
    }

    console.error("[FlashcardService] Unexpected error in createFlashcards:", {
      error: error instanceof Error ? error.message : "Unknown error",
      commands: commandsArray,
      userId,
      timestamp: new Date().toISOString(),
    });
    throw new FlashcardServiceError("Failed to create flashcard(s) due to an unexpected error");
  }
}
```

---

**End of Implementation Plan**

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-14  
**Author:** Robert Zdanowski  
**Status:** Ready for Implementation