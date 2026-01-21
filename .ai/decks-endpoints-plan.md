# API Endpoints Implementation Plan: Decks Management

## 1. Endpoints Overview

The Decks Management API provides CRUD operations for organizing flashcards into collections (decks). All endpoints interact directly with Supabase PostgREST API and rely on Row Level Security (RLS) policies to ensure users can only access their own decks. These endpoints are essential for the organizational structure of the FlashCard AI application, allowing users to categorize their learning materials.

### Endpoints Summary

| Endpoint | Method | Purpose | URL Pattern |
|----------|--------|---------|-------------|
| List Decks | GET | Retrieve all user's decks | `/api/decks` |
| Create Deck | POST | Create a new deck | `/api/decks` |
| Update Deck | PATCH | Rename an existing deck | `/api/decks/[id]` |
| Delete Deck | DELETE | Remove a deck and its flashcards | `/api/decks/[id]` |

**Key Features**:
- JWT-based authentication via Supabase Auth
- Automatic user_id association through RLS policies
- Cascade deletion of flashcards when deck is deleted
- Input validation using Zod schemas
- Service layer abstraction for business logic

---

## 2. Requests Details

### 2.1 List Decks

**HTTP Method**: `GET`

**URL Structure**: `/api/decks`

**Parameters**:
- Required: None (user identified via JWT)
- Optional: None

**Request Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**: None

**Query Parameters**: None (filtering by user handled automatically by RLS)

---

### 2.2 Create Deck

**HTTP Method**: `POST`

**URL Structure**: `/api/decks`

**Parameters**:
- Required:
  - `name` (string): Deck name, 1-100 characters, non-empty after trimming

**Request Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "History 101"
}
```

**Validation Rules**:
- `name` must be a string
- `name` must not be empty after trimming whitespace
- `name` should be limited to 100 characters for UI purposes
- `name` will be trimmed before saving

---

### 2.3 Update Deck

**HTTP Method**: `PATCH`

**URL Structure**: `/api/decks/[id]`

**Parameters**:
- Required (URL):
  - `id` (UUID): The deck identifier
- Required (Body):
  - `name` (string): New deck name, 1-100 characters, non-empty after trimming

**Request Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Advanced History"
}
```

**Validation Rules**:
- `id` must be a valid UUID format
- `name` must be a string
- `name` must not be empty after trimming whitespace
- `name` should be limited to 100 characters
- `name` will be trimmed before saving

---

### 2.4 Delete Deck

**HTTP Method**: `DELETE`

**URL Structure**: `/api/decks/[id]`

**Parameters**:
- Required (URL):
  - `id` (UUID): The deck identifier

**Request Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**: None

**Validation Rules**:
- `id` must be a valid UUID format

---

## 3. Used Types

### 3.1 Existing Types (from `src/types.ts`)

```typescript
// Entity type representing database record
export type DeckEntity = Tables<"decks">;

// DTO for API responses
export type DeckDTO = DeckEntity;

// Command models for requests
export type CreateDeckCommand = Pick<TablesInsert<"decks">, "name">;
export type UpdateDeckCommand = Pick<TablesUpdate<"decks">, "name">;
```

### 3.2 New Types to Add (in `src/types.ts`)

```typescript
/**
 * ListDecksResponseDTO - Response from list decks endpoint
 * Used in: GET /api/decks
 * 
 * Returns an array of all user's decks ordered by creation date descending
 */
export type ListDecksResponseDTO = DeckDTO[];
```

### 3.3 Validation Schemas (to create in service/validator)

Create file: `src/lib/validators/deck.validator.ts`

```typescript
import { z } from "zod";

/**
 * Schema for creating a new deck
 * Validates that name is provided and within acceptable limits
 */
export const createDeckSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Deck name cannot be empty")
    .max(100, "Deck name must be 100 characters or less"),
});

/**
 * Schema for updating a deck
 * Same validation rules as creation
 */
export const updateDeckSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Deck name cannot be empty")
    .max(100, "Deck name must be 100 characters or less"),
});

/**
 * Schema for validating UUID parameters
 * Used for both update and delete operations
 */
export const deckIdSchema = z.string().uuid("Invalid deck ID format");

// Export validated types
export type CreateDeckInput = z.infer<typeof createDeckSchema>;
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;
export type DeckIdInput = z.infer<typeof deckIdSchema>;
```

---

## 4. Responses Details

### 4.1 List Decks Response

**Success (200 OK)**:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user-uuid",
    "name": "History 101",
    "created_at": "2026-01-10T10:00:00.000Z",
    "updated_at": "2026-01-10T10:00:00.000Z"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "user_id": "user-uuid",
    "name": "Biology Basics",
    "created_at": "2026-01-09T15:30:00.000Z",
    "updated_at": "2026-01-12T08:20:00.000Z"
  }
]
```

**Empty Result (200 OK)**: `[]`

**Error Responses**:
- **401 Unauthorized**:
  ```json
  {
    "error": "Unauthorized",
    "message": "Missing or invalid authentication token"
  }
  ```
- **500 Internal Server Error**:
  ```json
  {
    "error": "Internal Server Error",
    "message": "Failed to fetch decks"
  }
  ```

---

### 4.2 Create Deck Response

**Success (201 Created)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174002",
  "user_id": "user-uuid",
  "name": "History 101",
  "created_at": "2026-01-13T10:00:00.000Z",
  "updated_at": "2026-01-13T10:00:00.000Z"
}
```

**Error Responses**:
- **400 Bad Request**:
  ```json
  {
    "error": "Validation Error",
    "message": "Deck name cannot be empty",
    "details": [
      {
        "field": "name",
        "message": "Deck name cannot be empty"
      }
    ]
  }
  ```
- **401 Unauthorized**:
  ```json
  {
    "error": "Unauthorized",
    "message": "Missing or invalid authentication token"
  }
  ```
- **500 Internal Server Error**:
  ```json
  {
    "error": "Internal Server Error",
    "message": "Failed to create deck"
  }
  ```

---

### 4.3 Update Deck Response

**Success (200 OK)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user-uuid",
  "name": "Advanced History",
  "created_at": "2026-01-10T10:00:00.000Z",
  "updated_at": "2026-01-13T11:00:00.000Z"
}
```

**Error Responses**:
- **400 Bad Request** (Invalid input):
  ```json
  {
    "error": "Validation Error",
    "message": "Invalid deck ID format",
    "details": [
      {
        "field": "id",
        "message": "Invalid deck ID format"
      }
    ]
  }
  ```
- **401 Unauthorized**:
  ```json
  {
    "error": "Unauthorized",
    "message": "Missing or invalid authentication token"
  }
  ```
- **404 Not Found**:
  ```json
  {
    "error": "Not Found",
    "message": "Deck not found or access denied"
  }
  ```
- **500 Internal Server Error**:
  ```json
  {
    "error": "Internal Server Error",
    "message": "Failed to update deck"
  }
  ```

---

### 4.4 Delete Deck Response

**Success (204 No Content)**: Empty response body

**Error Responses**:
- **400 Bad Request** (Invalid ID format):
  ```json
  {
    "error": "Validation Error",
    "message": "Invalid deck ID format",
    "details": [
      {
        "field": "id",
        "message": "Invalid deck ID format"
      }
    ]
  }
  ```
- **401 Unauthorized**:
  ```json
  {
    "error": "Unauthorized",
    "message": "Missing or invalid authentication token"
  }
  ```
- **404 Not Found**:
  ```json
  {
    "error": "Not Found",
    "message": "Deck not found or access denied"
  }
  ```
- **500 Internal Server Error**:
  ```json
  {
    "error": "Internal Server Error",
    "message": "Failed to delete deck"
  }
  ```

---

## 5. Data Flows

### 5.1 List Decks Flow

```
Client Request (GET /api/decks)
    ↓
[1] Middleware validates JWT token
    ↓
[2] Astro endpoint receives request
    ↓
[3] Extract user from context.locals.supabase
    ↓
[4] DeckService.listUserDecks()
    ↓
[5] Supabase query: SELECT * FROM decks 
    WHERE user_id = auth.uid() 
    ORDER BY created_at DESC
    ↓ (RLS automatically filters by user_id)
[6] Return array of DeckDTO
    ↓
[7] Response 200 OK with deck array
```

**Database Interaction**:
- Single SELECT query on `decks` table
- RLS policy ensures user sees only their decks
- Index `decks_user_id_idx` optimizes the query
- Returns ordered by `created_at DESC`

---

### 5.2 Create Deck Flow

```
Client Request (POST /api/decks)
    ↓
[1] Middleware validates JWT token
    ↓
[2] Astro endpoint receives request
    ↓
[3] Parse request body
    ↓
[4] Validate input with createDeckSchema
    ↓ (if validation fails → 400 Bad Request)
[5] Extract user from context.locals.supabase
    ↓
[6] DeckService.createDeck(command)
    ↓
[7] Supabase INSERT: 
    INSERT INTO decks (user_id, name) 
    VALUES (auth.uid(), $name)
    RETURNING *
    ↓
[8] Database auto-generates: id, created_at, updated_at
    ↓
[9] Return created DeckDTO
    ↓
[10] Response 201 Created with deck object
```

**Database Interaction**:
- Single INSERT query on `decks` table
- `user_id` automatically set to `auth.uid()` (from JWT)
- Database generates UUID for `id`
- Timestamps auto-populated by database defaults
- Trigger updates `updated_at` via `moddatetime` extension

---

### 5.3 Update Deck Flow

```
Client Request (PATCH /api/decks/[id])
    ↓
[1] Middleware validates JWT token
    ↓
[2] Astro endpoint receives request
    ↓
[3] Extract id from URL params
    ↓
[4] Validate id with deckIdSchema
    ↓ (if validation fails → 400 Bad Request)
[5] Parse request body
    ↓
[6] Validate input with updateDeckSchema
    ↓ (if validation fails → 400 Bad Request)
[7] Extract user from context.locals.supabase
    ↓
[8] DeckService.updateDeck(id, command)
    ↓
[9] Supabase UPDATE:
    UPDATE decks 
    SET name = $name, updated_at = NOW()
    WHERE id = $id AND user_id = auth.uid()
    RETURNING *
    ↓ (RLS ensures user can only update their own decks)
[10] Check if rows affected > 0
    ↓ (if 0 rows → 404 Not Found)
[11] Return updated DeckDTO
    ↓
[12] Response 200 OK with updated deck object
```

**Database Interaction**:
- Single UPDATE query on `decks` table
- RLS policy prevents updating other users' decks
- Trigger automatically updates `updated_at` timestamp
- If deck not found or doesn't belong to user, no rows affected

---

### 5.4 Delete Deck Flow

```
Client Request (DELETE /api/decks/[id])
    ↓
[1] Middleware validates JWT token
    ↓
[2] Astro endpoint receives request
    ↓
[3] Extract id from URL params
    ↓
[4] Validate id with deckIdSchema
    ↓ (if validation fails → 400 Bad Request)
[5] Extract user from context.locals.supabase
    ↓
[6] DeckService.deleteDeck(id)
    ↓
[7] Supabase DELETE:
    DELETE FROM decks 
    WHERE id = $id AND user_id = auth.uid()
    ↓ (RLS ensures user can only delete their own decks)
[8] CASCADE DELETE triggers:
    - Automatically deletes all flashcards 
      with deck_id = $id
    ↓
[9] Check if rows affected > 0
    ↓ (if 0 rows → 404 Not Found)
[10] Response 204 No Content
```

**Database Interaction**:
- Single DELETE query on `decks` table
- RLS policy prevents deleting other users' decks
- `ON DELETE CASCADE` foreign key constraint automatically removes all associated flashcards
- If deck not found or doesn't belong to user, no rows affected

---

## 6. Security Considerations

### 6.1 Authentication

**JWT Token Validation**:
- All endpoints require valid JWT token in `Authorization: Bearer <token>` header
- Token validated by Supabase middleware before reaching endpoint handler
- Invalid/missing tokens result in 401 Unauthorized response
- Token must not be expired (managed by Supabase Auth)

**Implementation**:
- Use `context.locals.supabase` (configured in Astro middleware)
- Never access Supabase client directly without authentication context
- Middleware automatically injects authenticated user into requests

---

### 6.2 Authorization (Row Level Security)

**RLS Policy for Decks Table**:
```sql
-- Users can only access their own decks
CREATE POLICY "Users can manage their own decks" ON decks
  FOR ALL USING (user_id = auth.uid());
```

**Benefits**:
- Authorization enforced at database level (defense in depth)
- Prevents horizontal privilege escalation
- No application logic needed for ownership checks
- SQL injection attempts automatically filtered

**User ID Handling**:
- `user_id` automatically populated from `auth.uid()` on INSERT
- Never accept `user_id` from client input
- RLS ensures all queries filter by `user_id = auth.uid()`

---

### 6.3 Input Validation

**Zod Schema Validation**:
- All user inputs validated before database queries
- Prevents malformed data from reaching database
- Type-safe validation with detailed error messages

**Specific Validations**:
1. **Deck Name**:
   - String type enforcement
   - Trim whitespace (prevents empty-looking names)
   - Length constraints (1-100 chars)
   - Prevents excessively long names that could break UI

2. **Deck ID (UUID)**:
   - Format validation using UUID regex
   - Prevents SQL injection attempts via malformed IDs
   - Early rejection of invalid requests (400 Bad Request)

**Sanitization**:
- Trim all string inputs to remove leading/trailing whitespace
- No HTML sanitization needed (Supabase handles parameterization)
- Frontend should escape output when displaying deck names

---

### 6.4 XSS Prevention

**Backend Measures**:
- No HTML rendering on backend (API-only endpoints)
- Input validation limits special characters indirectly through length
- Supabase parameterizes all queries (prevents SQL injection)

**Frontend Responsibility**:
- React automatically escapes JSX content
- Deck names should be rendered as text, never as HTML
- Avoid using `dangerouslySetInnerHTML` with deck data

---

### 6.5 CSRF Protection

**Mitigation**:
- Use SameSite cookie attribute for session tokens
- Astro middleware should include CSRF token validation for state-changing operations
- Consider requiring custom header (e.g., `X-Requested-With: XMLHttpRequest`)

---

### 6.6 Rate Limiting

**Current Implementation**:
- No rate limiting implemented in MVP
- Supabase connection pooling provides some protection

---

## 7. Error Handling

### 7.1 Error Categories and Handling Strategy

#### Client Errors (4xx)

**400 Bad Request - Validation Errors**:
- **Trigger**: Invalid input (empty name, malformed UUID)
- **Response**: Detailed validation error messages
- **Logging**: Info level (expected errors, no stack trace)
- **Example**:
  ```typescript
  {
    error: "Validation Error",
    message: "Deck name cannot be empty",
    details: [
      { field: "name", message: "Deck name cannot be empty" }
    ]
  }
  ```

**401 Unauthorized - Authentication Errors**:
- **Trigger**: Missing, invalid, or expired JWT token
- **Response**: Generic auth error message (avoid leaking token details)
- **Logging**: Warning level (potential security issue)
- **Handling**: Middleware should catch before endpoint; redirect to login

**404 Not Found - Resource Not Found**:
- **Trigger**: Deck ID doesn't exist or doesn't belong to user (RLS)
- **Response**: Generic "not found" message (don't leak existence)
- **Logging**: Info level (expected in normal operation)
- **Note**: RLS makes "doesn't exist" and "access denied" indistinguishable (security feature)

#### Server Errors (5xx)

**500 Internal Server Error - Unexpected Errors**:
- **Trigger**: Database connection failures, unexpected exceptions
- **Response**: Generic error message (never leak internal details)
- **Logging**: Error level with full stack trace
- **Recovery**: Attempt retry for transient failures; alert monitoring

---

### 7.2 Error Handling Implementation

**In Service Layer** (`src/lib/services/deck.service.ts`):
```typescript
try {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('[DeckService] Database error:', error);
    throw new Error('Failed to fetch decks');
  }
  
  return data;
} catch (error) {
  console.error('[DeckService] Unexpected error:', error);
  throw error; // Re-throw for endpoint to handle
}
```

**In Endpoint Handler** (e.g., `src/pages/api/decks/index.ts`):
```typescript
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Input validation
    // Service call
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Determine error type and respond appropriately
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({
        error: 'Validation Error',
        message: error.errors[0].message,
        details: error.errors
      }), { status: 400 });
    }
    
    // Generic 500 for unexpected errors
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Failed to process request'
    }), { status: 500 });
  }
};
```

---

### 7.3 Specific Error Scenarios

| Scenario | Status Code | Response | Handling |
|----------|-------------|----------|----------|
| Empty deck name | 400 | Validation error with field details | Validate with Zod before service call |
| Name too long (>100 chars) | 400 | Validation error with length limit | Validate with Zod before service call |
| Invalid UUID format | 400 | Invalid deck ID format | Validate with deckIdSchema |
| Missing auth token | 401 | Unauthorized message | Caught by middleware |
| Expired token | 401 | Unauthorized message | Caught by middleware |
| Deck not found (wrong ID) | 404 | Generic not found message | Check rows affected after UPDATE/DELETE |
| Deck belongs to another user | 404 | Generic not found message | RLS prevents access; appears as not found |
| Database connection failure | 500 | Generic server error | Log error, retry if transient |
| Database timeout | 500 | Generic server error | Log error, implement timeout handling |
| Unexpected exception | 500 | Generic server error | Log full stack trace for debugging |

---

### 7.4 Error Logging Strategy

**Console Logging**:
```typescript
// Service layer - detailed logs for debugging
console.error('[DeckService] Failed to create deck:', {
  error: error.message,
  command,
  userId: user.id,
  timestamp: new Date().toISOString()
});

// Endpoint layer - request context
console.error('[API /decks] Request failed:', {
  method: request.method,
  url: request.url,
  error: error.message,
  timestamp: new Date().toISOString()
});
```

**Production Considerations**:
- Integrate with monitoring service (e.g., Sentry, LogRocket)
- Include request ID for tracing across services
- Sanitize logs (never log tokens or sensitive data)
- Set up alerts for error rate thresholds

---

## 8. Performance Considerations

### 8.1 Database Query Optimization

**Indexes Utilized**:
- `decks_user_id_idx` on `decks(user_id)` - Optimizes listing decks by user
- Primary key index on `decks(id)` - Fast lookups for update/delete operations

**Query Patterns**:
- **List Decks**: Single table scan with index on `user_id`, sorted by `created_at`
  - Expected rows: Typically < 100 per user
  - Performance: < 10ms
  
- **Create Deck**: Single INSERT operation
  - Performance: < 5ms
  
- **Update Deck**: Single UPDATE with PK and `user_id` filter
  - Performance: < 5ms
  
- **Delete Deck**: Single DELETE with cascade
  - Performance: Depends on flashcard count; < 50ms for typical decks

---

### 8.2 Potential Bottlenecks

**Cascade Deletion**:
- Deleting a deck with thousands of flashcards could be slow
- Mitigation: 
  - Rely on database-level CASCADE (optimized by PostgreSQL)
  - Consider soft deletes for future enhancement (add `deleted_at` field)
  - Show loading indicator on frontend for large deletions

**Connection Pooling**:
- Supabase handles connection pooling automatically
- Astro SSR may create new connections per request
- Mitigation: Use persistent connection from `locals.supabase`

**Concurrent Requests**:
- Multiple simultaneous deck operations from same user
- Mitigation: PostgreSQL handles concurrency with ACID guarantees
- RLS policies evaluated per transaction (no race conditions)

---

### 8.3 Caching Strategy

**Not Applicable for MVP**:
- Decks are frequently updated (create, rename, delete)
- User-specific data (no shared cache across users)
- Database is fast enough without caching (< 100 decks per user)

---

### 8.4 Pagination

**Not Required for MVP**:
- Expected deck count per user: 10-50
- All decks fit in single response (< 10KB typically)
- Mobile-first design favors simple scrolling

---

### 8.5 Response Payload Size

**Typical Sizes**:
- Empty list: ~2 bytes (`[]`)
- Single deck: ~200 bytes (JSON)
- 50 decks: ~10 KB (acceptable for mobile)

**Optimization**:
- Return only necessary fields (currently returning all, which is fine)
- Gzip compression handled by Astro/hosting platform

---

## 9. Implementation Steps

### Step 1: Create Validation Schemas

**File**: `src/lib/validators/deck.validator.ts`

**Tasks**:
1. Create file in `src/lib/validators/` directory
2. Import Zod library
3. Define `createDeckSchema` with name validation (trim, min 1, max 100)
4. Define `updateDeckSchema` (same as create)
5. Define `deckIdSchema` for UUID validation
6. Export validated type aliases using `z.infer`
7. Add JSDoc comments for each schema

**Acceptance Criteria**:
- All schemas pass TypeScript type checking
- Schemas reject invalid inputs (empty strings, non-UUIDs)
- Schemas accept valid inputs

---

### Step 2: Create Deck Service

**File**: `src/lib/services/deck.service.ts`

**Tasks**:
1. Create file in `src/lib/services/` directory
2. Import necessary types from `src/types.ts` and `src/db/database.types.ts`
3. Import SupabaseClient type from `src/db/supabase.client.ts`
4. Implement `listUserDecks(supabase: SupabaseClient)`:
   - Query `decks` table with select all fields
   - Order by `created_at DESC`
   - Return `ListDecksResponseDTO`
   - Handle errors with try-catch
5. Implement `createDeck(supabase: SupabaseClient, command: CreateDeckCommand)`:
   - Insert new deck with name from command
   - Let database auto-populate id, user_id, timestamps
   - Return created `DeckDTO`
   - Handle errors with try-catch
6. Implement `updateDeck(supabase: SupabaseClient, id: string, command: UpdateDeckCommand)`:
   - Update deck where id matches
   - RLS handles user_id filtering
   - Check if rows affected > 0, throw error if not
   - Return updated `DeckDTO`
   - Handle errors with try-catch
7. Implement `deleteDeck(supabase: SupabaseClient, id: string)`:
   - Delete deck where id matches
   - RLS handles user_id filtering
   - Check if rows affected > 0, throw error if not
   - Return void on success
   - Handle errors with try-catch
8. Add comprehensive error logging with context
9. Add JSDoc comments for each function

**Acceptance Criteria**:
- All functions compile without TypeScript errors
- Functions use Supabase client passed from context (not global client)
- Error handling is consistent and comprehensive
- Functions return proper DTOs matching types in `src/types.ts`

---

### Step 3: Create List Decks Endpoint

**File**: `src/pages/api/decks/index.ts`

**Tasks**:
1. Create file with Astro API route structure
2. Export `prerender = false` constant
3. Implement `GET` handler:
   - Extract `supabase` from `locals`
   - Check authentication (return 401 if not authenticated)
   - Call `DeckService.listUserDecks(supabase)`
   - Return 200 with JSON array of decks
   - Handle errors and return appropriate status codes
4. Add error logging with request context
5. Set proper Content-Type headers

**Acceptance Criteria**:
- Endpoint returns 200 with deck array for authenticated users
- Endpoint returns 401 for unauthenticated requests
- Endpoint returns 500 for database errors
- Response format matches `ListDecksResponseDTO`

---

### Step 4: Create Create Deck Endpoint

**File**: `src/pages/api/decks/index.ts` (add POST handler)

**Tasks**:
1. In same file as GET handler
2. Implement `POST` handler:
   - Extract `supabase` from `locals`
   - Check authentication (return 401 if not authenticated)
   - Parse request body as JSON
   - Validate with `createDeckSchema`
   - Return 400 with validation errors if invalid
   - Call `DeckService.createDeck(supabase, command)`
   - Return 201 with created deck JSON
   - Handle errors and return appropriate status codes
3. Add error logging with request context
4. Set proper Content-Type headers

**Acceptance Criteria**:
- Endpoint returns 201 with created deck for valid requests
- Endpoint returns 400 for invalid input (empty name, too long)
- Endpoint returns 401 for unauthenticated requests
- Endpoint returns 500 for database errors
- Response format matches `DeckDTO`
- Created deck includes auto-generated id and timestamps

---

### Step 5: Create Update Deck Endpoint

**File**: `src/pages/api/decks/[id].ts`

**Tasks**:
1. Create file for dynamic route with `[id]` parameter
2. Export `prerender = false` constant
3. Implement `PATCH` handler:
   - Extract `id` from `params`
   - Validate id with `deckIdSchema`
   - Return 400 if invalid UUID format
   - Extract `supabase` from `locals`
   - Check authentication (return 401 if not authenticated)
   - Parse request body as JSON
   - Validate with `updateDeckSchema`
   - Return 400 with validation errors if invalid
   - Call `DeckService.updateDeck(supabase, id, command)`
   - Return 200 with updated deck JSON
   - Handle errors (404 if not found, 500 for others)
4. Add error logging with request context
5. Set proper Content-Type headers

**Acceptance Criteria**:
- Endpoint returns 200 with updated deck for valid requests
- Endpoint returns 400 for invalid input (invalid UUID, empty name)
- Endpoint returns 401 for unauthenticated requests
- Endpoint returns 404 for non-existent or unauthorized deck
- Endpoint returns 500 for database errors
- Response format matches `DeckDTO`
- Updated deck shows new `updated_at` timestamp

---

### Step 6: Create Delete Deck Endpoint

**File**: `src/pages/api/decks/[id].ts` (add DELETE handler)

**Tasks**:
1. In same file as PATCH handler
2. Implement `DELETE` handler:
   - Extract `id` from `params`
   - Validate id with `deckIdSchema`
   - Return 400 if invalid UUID format
   - Extract `supabase` from `locals`
   - Check authentication (return 401 if not authenticated)
   - Call `DeckService.deleteDeck(supabase, id)`
   - Return 204 No Content on success
   - Handle errors (404 if not found, 500 for others)
3. Add error logging with request context

**Acceptance Criteria**:
- Endpoint returns 204 No Content for successful deletions
- Endpoint returns 400 for invalid UUID format
- Endpoint returns 401 for unauthenticated requests
- Endpoint returns 404 for non-existent or unauthorized deck
- Endpoint returns 500 for database errors
- Deck and all associated flashcards are deleted (CASCADE)
- No response body on success

---

### Step 7: Update Type Definitions

**File**: `src/types.ts`

**Tasks**:
1. Add `ListDecksResponseDTO` type alias (array of DeckDTO)
2. Add JSDoc comment explaining its usage
3. Verify all existing deck-related types are properly documented

**Acceptance Criteria**:
- New type exports without errors
- Type is used consistently in service and endpoints
- JSDoc comments are clear and reference API plan sections

---

### Step 8: Testing and Validation

**Manual Testing Tasks**:
1. Test List Decks:
   - Verify empty array for new users
   - Verify decks are sorted by created_at DESC
   - Verify only user's own decks are returned
2. Test Create Deck:
   - Create deck with valid name
   - Try creating with empty name (expect 400)
   - Try creating with 101+ char name (expect 400)
   - Verify auto-generated fields (id, timestamps)
3. Test Update Deck:
   - Update existing deck name
   - Try updating with invalid UUID (expect 400)
   - Try updating non-existent deck (expect 404)
   - Try updating another user's deck (expect 404)
   - Verify updated_at changes
4. Test Delete Deck:
   - Delete empty deck
   - Delete deck with flashcards (verify cascade)
   - Try deleting with invalid UUID (expect 400)
   - Try deleting non-existent deck (expect 404)
   - Try deleting another user's deck (expect 404)
5. Test Authentication:
   - Try all endpoints without token (expect 401)
   - Try all endpoints with expired token (expect 401)
   - Try all endpoints with invalid token (expect 401)
6. Test Error Handling:
   - Verify proper error response format
   - Verify error messages don't leak sensitive info
   - Verify errors are logged appropriately

**Tools**:
- Postman or Thunder Client for API testing
- Supabase Dashboard for database verification
- Browser DevTools Network tab for frontend integration

**Acceptance Criteria**:
- All test cases pass with expected status codes
- Error responses follow documented format
- No sensitive information leaked in error messages
- Logs contain sufficient debugging information

---

### Step 9: Documentation and Code Review

**Tasks**:
1. Review all code for adherence to style guide
2. Verify all functions have JSDoc comments
3. Check error handling is consistent across all endpoints
4. Verify TypeScript strict mode compliance
5. Review for security issues (SQL injection, XSS, etc.)
6. Ensure RLS policies are properly relied upon
7. Verify validation schemas cover all edge cases
8. Update README if needed with API documentation

**Acceptance Criteria**:
- Code passes linting without errors
- All functions are properly documented
- Security best practices are followed
- No TypeScript errors or warnings
- Code is ready for production deployment

---

## Summary

This implementation plan provides a comprehensive guide for building the Decks Management API endpoints. The design prioritizes:
- **Security**: JWT authentication, RLS policies, input validation
- **Simplicity**: RESTful design, clear error messages, straightforward data flows
- **Performance**: Indexed queries, efficient database operations
- **Maintainability**: Service layer abstraction, comprehensive error handling, detailed logging

By following these steps, the development team will create a robust, secure, and user-friendly API for managing flashcard decks.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-13  
**Author:** Robert Zdanowski  
**Status:** Ready for Implementation