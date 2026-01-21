# API Endpoints Implementation Plan: Study Logic (Review Queue & SM-2 Processing)

## 1. Endpoints Overview

This implementation plan covers two critical endpoints for the spaced repetition learning flow:

1. **Fetch Study Queue** - Retrieves flashcards due for review based on SM-2 algorithm scheduling
2. **Process Review** - Processes user's rating of a flashcard and calculates next review date using SM-2 algorithm

Both endpoints are essential for the study workflow where users review flashcards at algorithmically determined intervals. The endpoints leverage the open-source `supermemo` npm library for SM-2 calculations and rely on Supabase Row Level Security (RLS) for authorization.

**Key Characteristics:**
- Mobile-optimized with pagination (default 20 cards per batch)
- Stateless SM-2 calculations using proven library
- Optional deck filtering for focused study sessions
- Real-time quota tracking and update
- Full RLS protection ensuring users only access their own data

---

## 2. Request Details

### 2.1. Fetch Study Queue

**HTTP Method:** `GET`

**URL Structure:** `/api/study/queue`

**Authentication:** Required (JWT Bearer token in Authorization header)

**Query Parameters:**
- `deck_id` (optional): `string` (UUID format)
  - Description: Filter flashcards to a specific deck
  - Validation: Must be valid UUID format if provided
  - Example: `?deck_id=550e8400-e29b-41d4-a716-446655440000`

- `limit` (optional): `number`
  - Description: Maximum number of flashcards to return
  - Default: `20`
  - Validation: Must be integer between 1 and 100
  - Example: `?limit=10`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Example Requests:**
```bash
# Fetch all due flashcards (default limit 20)
GET /api/study/queue

# Fetch due flashcards for specific deck
GET /api/study/queue?deck_id=550e8400-e29b-41d4-a716-446655440000

# Fetch only 10 flashcards
GET /api/study/queue?limit=10

# Combine deck filter and limit
GET /api/study/queue?deck_id=550e8400-e29b-41d4-a716-446655440000&limit=5
```

---

### 2.2. Process Review

**HTTP Method:** `POST`

**URL Structure:** `/api/study/review`

**Authentication:** Required (JWT Bearer token in Authorization header)

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```typescript
{
  "card_id": "uuid",      // UUID of the flashcard being reviewed
  "rating": "good"        // One of: "again" | "hard" | "good" | "easy"
}
```

**Request Body Parameters:**
- `card_id` (required): `string`
  - Description: UUID of the flashcard being reviewed
  - Validation: Must be valid UUID format
  - Validation: Flashcard must exist and belong to authenticated user (enforced by RLS)

- `rating` (required): `string`
  - Description: User's recall quality rating
  - Validation: Must be one of: `"again"`, `"hard"`, `"good"`, `"easy"`
  - Mapping to SM-2 grades:
    - `"again"` → 1 (Complete blackout, wrong answer)
    - `"hard"` → 3 (Correct but with significant difficulty)
    - `"good"` → 4 (Correct with some hesitation)
    - `"easy"` → 5 (Perfect, instant recall)

**Example Request:**
```bash
POST /api/study/review
Content-Type: application/json
Authorization: Bearer eyJhbGc...

{
  "card_id": "123e4567-e89b-12d3-a456-426614174000",
  "rating": "good"
}
```

---

## 3. Used Types

### 3.1. Response DTOs

```typescript
/**
 * FetchStudyQueueResponseDTO - Array of flashcards due for review
 * Used in: GET /api/study/queue
 */
export type FetchStudyQueueResponseDTO = FlashcardDTO[];

/**
 * ProcessReviewResponseDTO - Updated flashcard with new SM-2 state
 * Used in: POST /api/study/review
 * 
 * Returns only the fields relevant to the study UI:
 * - id: To identify the flashcard
 * - SM-2 state fields: For algorithm tracking and debugging
 * - next_review_date: To determine when card should appear again
 */
export interface ProcessReviewResponseDTO {
  id: string;
  repetition_number: number;
  easiness_factor: number;
  interval: number;
  next_review_date: string; // ISO 8601 timestamp
}
```

### 3.2. Command Models

```typescript
/**
 * FetchStudyQueueCommand - Query parameters for fetching study queue
 * Used in: GET /api/study/queue
 */
export interface FetchStudyQueueCommand {
  deck_id?: string;  // Optional UUID
  limit?: number;    // Optional, default 20, max 100
}

/**
 * ProcessReviewCommand - Request payload for processing review
 * Used in: POST /api/study/review
 * 
 * Note: The existing ProcessReviewCommand in types.ts uses ReviewRating enum
 * which has numeric values. This should be updated to use string literals
 * to match the API specification.
 */
export interface ProcessReviewCommand {
  card_id: string;
  rating: "again" | "hard" | "good" | "easy";
}
```

### 3.3. Internal Service Types

```typescript
/**
 * SM2Rating - Internal enum for mapping UI ratings to SM-2 grades
 */
export const SM2_GRADE_MAP = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
} as const;

export type SM2Rating = keyof typeof SM2_GRADE_MAP;

/**
 * SM2State - Current state of a flashcard in the SM-2 algorithm
 */
export interface SM2State {
  interval: number;          // Current interval in days
  repetition: number;        // Number of successful repetitions
  efactor: number;          // Easiness factor (2.5 is default)
}

/**
 * SM2Result - Output from supermemo library
 */
export interface SM2Result {
  interval: number;          // New interval in days
  repetition: number;        // Updated repetition count
  efactor: number;          // Updated easiness factor
}
```

---

## 4. Response Details

### 4.1. Fetch Study Queue Response

**Success Response (200 OK):**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "deck_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "front": "What is the capital of France?",
    "back": "Paris",
    "creation_source": "AI",
    "generation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "repetition_number": 2,
    "easiness_factor": 2.5,
    "interval": 6,
    "next_review_date": "2026-01-15T10:00:00Z",
    "created_at": "2026-01-10T08:30:00Z",
    "updated_at": "2026-01-14T12:00:00Z"
  },
  {
    "id": "234e5678-e89b-12d3-a456-426614174001",
    "deck_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "front": "What is photosynthesis?",
    "back": "The process by which plants convert light energy into chemical energy",
    "creation_source": "Manual",
    "generation_id": null,
    "repetition_number": 0,
    "easiness_factor": 2.5,
    "interval": 0,
    "next_review_date": "2026-01-15T10:30:00Z",
    "created_at": "2026-01-15T09:00:00Z",
    "updated_at": "2026-01-15T09:00:00Z"
  }
]
```

**Empty Queue (200 OK):**
```json
[]
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid request parameters",
  "details": {
    "deck_id": "Invalid UUID format"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred while fetching study queue"
}
```

---

### 4.2. Process Review Response

**Success Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "repetition_number": 3,
  "easiness_factor": 2.6,
  "interval": 15,
  "next_review_date": "2026-01-30T00:00:00Z"
}
```

**Error Response (400 Bad Request - Invalid Input):**
```json
{
  "error": "Invalid request body",
  "details": {
    "card_id": "Invalid UUID format",
    "rating": "Must be one of: again, hard, good, easy"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Flashcard not found",
  "message": "The requested flashcard does not exist or you do not have permission to access it"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred while processing the review"
}
```

---

## 5. Data Flows

### 5.1. Fetch Study Queue Flow

```
1. Client Request
   └─> GET /api/study/queue?deck_id={uuid}&limit=20
       └─> Authorization: Bearer {jwt_token}

2. Astro Middleware
   └─> Extract JWT from Authorization header
   └─> Create Supabase client with user context
   └─> Attach to Astro.locals.supabase

3. API Endpoint Handler (/src/pages/api/study/queue.ts)
   └─> Extract and validate query parameters (deck_id, limit)
   └─> Call study.service.fetchStudyQueue()

4. Study Service (/src/lib/services/study.service.ts)
   └─> Build Supabase query:
       └─> SELECT * FROM flashcards
       └─> WHERE next_review_date <= NOW()
       └─> AND user_id = auth.uid() (enforced by RLS)
       └─> [Optional] AND deck_id = {uuid}
       └─> ORDER BY next_review_date ASC
       └─> LIMIT {limit}
   └─> Execute query
   └─> Return FlashcardDTO[]

5. Response
   └─> 200 OK with array of flashcards
   └─> OR 400 Bad Request if validation fails
   └─> OR 401 Unauthorized if auth fails
   └─> OR 500 Internal Server Error if database error
```

**Database Query Example:**
```typescript
const query = supabase
  .from('flashcards')
  .select('*')
  .lte('next_review_date', new Date().toISOString())
  .order('next_review_date', { ascending: true })
  .limit(limit);

if (deck_id) {
  query.eq('deck_id', deck_id);
}

const { data, error } = await query;
```

**RLS Protection:**
- The `flashcards` table has RLS policy: `user_id = auth.uid()`
- Users can only fetch their own flashcards
- Invalid `deck_id` owned by another user will return empty array (not 404)

---

### 5.2. Process Review Flow

```
1. Client Request
   └─> POST /api/study/review
       └─> Body: { card_id, rating }
       └─> Authorization: Bearer {jwt_token}

2. Astro Middleware
   └─> Extract JWT from Authorization header
   └─> Create Supabase client with user context
   └─> Attach to Astro.locals.supabase

3. API Endpoint Handler (/src/pages/api/study/review.ts)
   └─> Validate request body (card_id, rating)
   └─> Call study.service.processReview()

4. Study Service (/src/lib/services/study.service.ts)
   └─> Fetch current flashcard:
       └─> SELECT * FROM flashcards WHERE id = {card_id}
       └─> RLS enforces user ownership
   └─> If not found → throw 404 error
   
   └─> Extract current SM-2 state:
       └─> { interval, repetition_number, easiness_factor }
   
   └─> Map rating to SM-2 grade:
       └─> "again" → 1, "hard" → 3, "good" → 4, "easy" → 5
   
   └─> Call supermemo library:
       └─> import { supermemo } from 'supermemo'
       └─> const result = supermemo(currentState, grade)
       └─> result: { interval, repetition, efactor }
   
   └─> Calculate next_review_date:
       └─> next_review_date = NOW() + interval (days)
   
   └─> Update flashcard in database:
       └─> UPDATE flashcards SET
           repetition_number = result.repetition,
           easiness_factor = result.efactor,
           interval = result.interval,
           next_review_date = calculated_date
           WHERE id = {card_id}
       └─> RLS enforces user ownership
   
   └─> Return ProcessReviewResponseDTO

5. Response
   └─> 200 OK with updated SM-2 state
   └─> OR 400 Bad Request if validation fails
   └─> OR 401 Unauthorized if auth fails
   └─> OR 404 Not Found if card doesn't exist or not owned by user
   └─> OR 500 Internal Server Error if unexpected error
```

**SM-2 Calculation Example:**
```typescript
import { supermemo, SuperMemoItem, SuperMemoGrade } from 'supermemo';

// Current state from database
const currentState: SuperMemoItem = {
  interval: flashcard.interval,
  repetition: flashcard.repetition_number,
  efactor: flashcard.easiness_factor,
};

// Map rating to grade
const gradeMap: Record<string, SuperMemoGrade> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

// Calculate new state
const result = supermemo(currentState, gradeMap[rating]);

// Calculate next review date
const nextReviewDate = new Date();
nextReviewDate.setDate(nextReviewDate.getDate() + result.interval);
```

---

## 6. Security Considerations

### 6.1. Authentication
- **Mechanism:** Supabase Auth with JWT tokens
- **Implementation:** Astro middleware extracts JWT from `Authorization: Bearer <token>` header
- **Token Validation:** Supabase SDK automatically validates token signature and expiration
- **Missing Token:** Return 401 Unauthorized immediately

### 6.2. Authorization (Row Level Security)
- **Database-Level Protection:** All queries to `flashcards` table filtered by `user_id = auth.uid()`
- **User Isolation:** Users can only access their own flashcards, even with valid card_id of another user
- **Deck Filtering:** When `deck_id` is provided, RLS ensures the deck belongs to the user
- **No Additional Checks Required:** RLS handles all authorization logic

### 6.3. Input Validation
- **UUID Validation:** All `card_id` and `deck_id` parameters must be valid UUID v4 format
- **Rating Validation:** Must be one of the 4 allowed string literals
- **Limit Validation:** Must be positive integer, capped at 100 to prevent abuse
- **SQL Injection Protection:** Supabase SDK uses parameterized queries (automatic)

### 6.4. Data Sanitization
- **Output:** All data from database is returned as-is (trusted source)
- **Input:** Zod schemas validate and sanitize all user input before processing

### 6.5. CORS Configuration
- **Astro Default:** CORS is configured at application level
- **Recommendation:** Restrict origins to frontend domain in production

---

## 7. Error Handling

### 7.1. Validation Errors (400 Bad Request)

**Scenario 1: Invalid UUID Format**
- **Trigger:** `card_id` or `deck_id` is not a valid UUID
- **Example:** `card_id: "invalid-uuid"`
- **Response:**
  ```json
  {
    "error": "Invalid request parameters",
    "details": {
      "card_id": "Invalid UUID format"
    }
  }
  ```

**Scenario 2: Invalid Rating Value**
- **Trigger:** `rating` is not one of allowed values
- **Example:** `rating: "medium"`
- **Response:**
  ```json
  {
    "error": "Invalid request body",
    "details": {
      "rating": "Must be one of: again, hard, good, easy"
    }
  }
  ```

**Scenario 3: Missing Required Fields**
- **Trigger:** `card_id` or `rating` is missing in request body
- **Response:**
  ```json
  {
    "error": "Invalid request body",
    "details": {
      "card_id": "Required field is missing"
    }
  }
  ```

**Scenario 4: Invalid Limit**
- **Trigger:** `limit` is not a positive integer or exceeds maximum
- **Example:** `limit: -5` or `limit: 1000`
- **Response:**
  ```json
  {
    "error": "Invalid request parameters",
    "details": {
      "limit": "Must be a positive integer between 1 and 100"
    }
  }
  ```

---

### 7.2. Authentication Errors (401 Unauthorized)

**Scenario 1: Missing Authorization Header**
- **Trigger:** Request does not include `Authorization` header
- **Response:**
  ```json
  {
    "error": "Unauthorized",
    "message": "Missing authentication token"
  }
  ```

**Scenario 2: Invalid Token Format**
- **Trigger:** Authorization header is malformed
- **Example:** `Authorization: InvalidFormat`
- **Response:**
  ```json
  {
    "error": "Unauthorized",
    "message": "Invalid authentication token format"
  }
  ```

**Scenario 3: Expired Token**
- **Trigger:** JWT token has expired
- **Response:**
  ```json
  {
    "error": "Unauthorized",
    "message": "Authentication token has expired"
  }
  ```

**Scenario 4: Invalid Token Signature**
- **Trigger:** Token has been tampered with or is invalid
- **Response:**
  ```json
  {
    "error": "Unauthorized",
    "message": "Invalid authentication token"
  }
  ```

---

### 7.3. Resource Not Found (404 Not Found)

**Scenario 1: Flashcard Does Not Exist**
- **Trigger:** `card_id` references non-existent flashcard
- **Endpoint:** POST /api/study/review
- **Response:**
  ```json
  {
    "error": "Flashcard not found",
    "message": "The requested flashcard does not exist or you do not have permission to access it"
  }
  ```

**Note:** For Fetch Study Queue, non-existent or unauthorized `deck_id` returns empty array (200 OK), not 404. This prevents information leakage about existence of decks.

---

### 7.4. Server Errors (500 Internal Server Error)

**Scenario 1: Database Connection Error**
- **Trigger:** Supabase connection fails
- **Logging:** Log full error with stack trace
- **Response:**
  ```json
  {
    "error": "Internal server error",
    "message": "Database connection failed"
  }
  ```

**Scenario 2: SuperMemo Library Error**
- **Trigger:** `supermemo()` function throws unexpected error
- **Logging:** Log error with flashcard state and rating
- **Response:**
  ```json
  {
    "error": "Internal server error",
    "message": "Failed to calculate review schedule"
  }
  ```

**Scenario 3: Database Update Failure**
- **Trigger:** UPDATE query fails due to constraint violation or database error
- **Logging:** Log error with flashcard ID and attempted values
- **Response:**
  ```json
  {
    "error": "Internal server error",
    "message": "Failed to update flashcard"
  }
  ```

**Scenario 4: Unexpected Runtime Error**
- **Trigger:** Any unhandled exception in service or endpoint
- **Logging:** Log full error with stack trace and request context
- **Response:**
  ```json
  {
    "error": "Internal server error",
    "message": "An unexpected error occurred"
  }
  ```

---

### 7.5. Error Handling Strategy

**Error Logging:**
```typescript
// Log errors with context
console.error('Error in processReview:', {
  error: error.message,
  stack: error.stack,
  card_id,
  rating,
  user_id: user?.id,
  timestamp: new Date().toISOString(),
});
```

**Error Response Helper:**
```typescript
function errorResponse(statusCode: number, error: string, message?: string, details?: any) {
  return new Response(
    JSON.stringify({
      error,
      message,
      ...(details && { details }),
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

**Try-Catch Blocks:**
- Wrap all database operations in try-catch
- Wrap supermemo library calls in try-catch
- Catch and log errors at service layer
- Return appropriate error responses at endpoint layer

---

## 8. Performance Considerations

### 8.1. Database Query Optimization

**Index Usage:**
- **`flashcards_study_idx`**: Composite index on `(user_id, deck_id, next_review_date)`
  - Optimizes the study queue query (most frequent operation)
  - Enables efficient filtering by user, deck, and review date
  - Supports ORDER BY on `next_review_date`

**Query Performance:**
- **Fetch Study Queue:** O(log n) with index, typically < 50ms for most users
- **Process Review:** Single row SELECT + UPDATE, typically < 20ms
- **LIMIT Clause:** Prevents large result sets, improves response time

**Connection Pooling:**
- Supabase SDK handles connection pooling automatically
- No manual connection management required

---

### 8.2. Pagination Strategy

**Default Limit:** 20 flashcards
- **Rationale:** Mobile-optimized batch size
- **Trade-offs:** 
  - Smaller batches: More frequent API calls, better mobile performance
  - Larger batches: Fewer API calls, potential memory issues on low-end devices

**Maximum Limit:** 100 flashcards
- **Rationale:** Prevents abuse and excessive database load
- **Recommendation:** Frontend should use default unless user explicitly requests more

---

### 8.3. Bottleneck Analysis

**Potential Bottlenecks:**
1. **Database Queries:** Mitigated by composite indexes
2. **JWT Validation:** Handled efficiently by Supabase SDK
3. **SuperMemo Calculations:** Negligible (simple arithmetic operations)
4. **Network Latency:** Depends on user location and server proximity

**Load Testing Recommendations:**
- Test with 1000+ concurrent users fetching study queues
- Test Process Review endpoint with high-frequency submissions
- Monitor database connection pool saturation

---

## 9. Implementation Steps

### Step 1: Install Dependencies
```bash
# Install supermemo library
npm install supermemo

# Install types for supermemo
npm install --save-dev @types/supermemo
```

**Validation:**
- Verify `supermemo` appears in `package.json` dependencies
- Test import: `import { supermemo } from 'supermemo'`

---

### Step 2: Update Type Definitions

**File:** `/src/types.ts`

**Actions:**
1. Add new response DTO types:
   ```typescript
   export type FetchStudyQueueResponseDTO = FlashcardDTO[];
   
   export interface ProcessReviewResponseDTO {
     id: string;
     repetition_number: number;
     easiness_factor: number;
     interval: number;
     next_review_date: string;
   }
   ```

2. Add command model for fetch study queue:
   ```typescript
   export interface FetchStudyQueueCommand {
     deck_id?: string;
     limit?: number;
   }
   ```

3. Update `ProcessReviewCommand` to use string literals:
   ```typescript
   export interface ProcessReviewCommand {
     card_id: string;
     rating: "again" | "hard" | "good" | "easy";
   }
   ```

4. Add internal service types:
   ```typescript
   export const SM2_GRADE_MAP = {
     again: 1,
     hard: 3,
     good: 4,
     easy: 5,
   } as const;
   
   export type SM2Rating = keyof typeof SM2_GRADE_MAP;
   ```

**Validation:**
- Run TypeScript compiler: `npx tsc --noEmit`
- Verify no type errors

---

### Step 3: Create Zod Validators

**File:** `/src/lib/validators/study.validator.ts`

**Content:**
```typescript
import { z } from 'zod';

/**
 * Validator for Fetch Study Queue query parameters
 */
export const fetchStudyQueueSchema = z.object({
  deck_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Validator for Process Review request body
 */
export const processReviewSchema = z.object({
  card_id: z.string().uuid({
    message: 'Invalid UUID format for card_id',
  }),
  rating: z.enum(['again', 'hard', 'good', 'easy'], {
    errorMap: () => ({ message: 'Must be one of: again, hard, good, easy' }),
  }),
});
```

---

### Step 4: Create Study Service

**File:** `/src/lib/services/study.service.ts`

**Content:**
```typescript
import { supermemo, SuperMemoItem, SuperMemoGrade } from 'supermemo';
import type { SupabaseClient } from '../db/supabase.client';
import type {
  FlashcardDTO,
  FetchStudyQueueCommand,
  ProcessReviewCommand,
  ProcessReviewResponseDTO,
  SM2Rating,
  SM2_GRADE_MAP,
} from '../types';

/**
 * Map UI rating strings to SM-2 grades
 */
const GRADE_MAP: Record<string, SuperMemoGrade> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

/**
 * Fetch flashcards due for review
 */
export async function fetchStudyQueue(
  supabase: SupabaseClient,
  params: FetchStudyQueueCommand
): Promise<FlashcardDTO[]> {
  const { deck_id, limit = 20 } = params;

  // Build query for flashcards due for review
  let query = supabase
    .from('flashcards')
    .select('*')
    .lte('next_review_date', new Date().toISOString())
    .order('next_review_date', { ascending: true })
    .limit(limit);

  // Optional filtering by deck
  if (deck_id) {
    query = query.eq('deck_id', deck_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching study queue:', {
      error: error.message,
      deck_id,
      limit,
    });
    throw new Error('Failed to fetch study queue');
  }

  return data as FlashcardDTO[];
}

/**
 * Process a flashcard review using SM-2 algorithm
 */
export async function processReview(
  supabase: SupabaseClient,
  command: ProcessReviewCommand
): Promise<ProcessReviewResponseDTO> {
  const { card_id, rating } = command;

  // 1. Fetch current flashcard
  const { data: flashcard, error: fetchError } = await supabase
    .from('flashcards')
    .select('*')
    .eq('id', card_id)
    .single();

  if (fetchError || !flashcard) {
    console.error('Error fetching flashcard:', {
      error: fetchError?.message,
      card_id,
    });
    throw new Error('Flashcard not found');
  }

  // 2. Extract current SM-2 state
  const currentState: SuperMemoItem = {
    interval: flashcard.interval,
    repetition: flashcard.repetition_number,
    efactor: flashcard.easiness_factor,
  };

  // 3. Calculate new SM-2 state
  const grade = GRADE_MAP[rating];
  let result;
  
  try {
    result = supermemo(currentState, grade);
  } catch (error) {
    console.error('Error calculating SM-2:', {
      error,
      currentState,
      grade,
      card_id,
    });
    throw new Error('Failed to calculate review schedule');
  }

  // 4. Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + result.interval);

  // 5. Update flashcard in database
  const { data: updatedCard, error: updateError } = await supabase
    .from('flashcards')
    .update({
      repetition_number: result.repetition,
      easiness_factor: result.efactor,
      interval: result.interval,
      next_review_date: nextReviewDate.toISOString(),
    })
    .eq('id', card_id)
    .select('id, repetition_number, easiness_factor, interval, next_review_date')
    .single();

  if (updateError || !updatedCard) {
    console.error('Error updating flashcard:', {
      error: updateError?.message,
      card_id,
      newState: result,
    });
    throw new Error('Failed to update flashcard');
  }

  return updatedCard as ProcessReviewResponseDTO;
}
```

---

### Step 5: Create API Endpoint - Fetch Study Queue

**File:** `/src/pages/api/study/queue.ts`

**Content:**
```typescript
import type { APIRoute } from 'astro';
import { fetchStudyQueue } from '../../../lib/services/study.service';
import { fetchStudyQueueSchema } from '../../../lib/validators/study.validator';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Check authentication
    const supabase = locals.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Missing or invalid authentication token',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse and validate query parameters
    const url = new URL(request.url);
    const params = {
      deck_id: url.searchParams.get('deck_id') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    };

    const validation = fetchStudyQueueSchema.safeParse(params);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request parameters',
          details: validation.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch study queue
    const flashcards = await fetchStudyQueue(supabase, validation.data);

    // 4. Return response
    return new Response(JSON.stringify(flashcards), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/study/queue:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching study queue',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

### Step 6: Create API Endpoint - Process Review

**File:** `/src/pages/api/study/review.ts`

**Content:**
```typescript
import type { APIRoute } from 'astro';
import { processReview } from '../../../lib/services/study.service';
import { processReviewSchema } from '../../../lib/validators/study.validator';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Check authentication
    const supabase = locals.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Missing or invalid authentication token',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          message: 'Request body must be valid JSON',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate request body
    const validation = processReviewSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          details: validation.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Process review
    let result;

    try {
      result = await processReview(supabase, validation.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if it's a "not found" error
      if (errorMessage.includes('not found')) {
        return new Response(
          JSON.stringify({
            error: 'Flashcard not found',
            message: 'The requested flashcard does not exist or you do not have permission to access it',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Otherwise it's a server error
      throw error;
    }

    // 5. Return response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/study/review:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the review',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

### Step 8: Testing

**Manual Testing Checklist:**
- [ ] User can fetch study queue with valid auth
- [ ] User cannot fetch queue without auth (401)
- [ ] User can filter queue by deck
- [ ] User can specify custom limit
- [ ] Empty queue returns empty array (not error)
- [ ] User can process review with all rating values
- [ ] SM-2 state updates correctly in database
- [ ] next_review_date is calculated correctly
- [ ] User cannot review another user's flashcard (404 due to RLS)
- [ ] Invalid inputs return appropriate error messages

---

### Step 9: Database Verification

**Verify Index Exists:**
```sql
-- Check if composite index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'flashcards'
AND indexname = 'flashcards_study_idx';
```

**Expected Result:**
```
indexname           | flashcards_study_idx
indexdef            | CREATE INDEX flashcards_study_idx ON flashcards (user_id, deck_id, next_review_date)
```

**Verify RLS Policies:**
```sql
-- Check RLS policies on flashcards table
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'flashcards';
```

**Expected Policies:**
- SELECT policy: `user_id = auth.uid()`
- INSERT policy: `user_id = auth.uid()`
- UPDATE policy: `user_id = auth.uid()`
- DELETE policy: `user_id = auth.uid()`

---

### Step 10: Documentation

1. **Update API Documentation:**
   - Document new endpoints in `/api-plan.md` (already done)
   - Add example requests and responses
   - Document error codes and their meanings

2. **Update README:**
   - Add section on study logic endpoints
   - Document SM-2 rating scale mapping
   - Add usage examples

3. **Code Comments:**
   - Ensure all functions have JSDoc comments
   - Document complex logic (SM-2 calculations, date handling)
   - Add inline comments for non-obvious code

4. **Frontend Integration Guide:**
   - Document how to call endpoints from frontend
   - Provide TypeScript types for request/response
   - Document error handling strategy for UI

---

## 10. Additional Notes

### SuperMemo Library Usage

The `supermemo` library requires specific input and output formats:

**Input (SuperMemoItem):**
```typescript
{
  interval: number;   // Days until next review
  repetition: number; // Number of consecutive correct reviews
  efactor: number;    // Easiness factor (difficulty rating)
}
```

**Output (SuperMemoItem):**
```typescript
{
  interval: number;   // Updated interval
  repetition: number; // Updated repetition count
  efactor: number;    // Updated easiness factor
}
```

**Important Notes:**
- Initial values: `{ interval: 0, repetition: 0, efactor: 2.5 }`
- Grades below 3 reset repetition count to 0
- Easiness factor is clamped between 1.3 and 2.5
- Interval follows SuperMemo 2 formula

---

## 11. References

- [SuperMemo 2 Algorithm Documentation](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- [supermemo npm package](https://www.npmjs.com/package/supermemo)
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Astro API Routes Documentation](https://docs.astro.build/en/core-concepts/endpoints/)
- [Zod Documentation](https://zod.dev/)

---

**End of Implementation Plan**

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-15  
**Author:** Robert Zdanowski  
**Status:** Ready for Implementation