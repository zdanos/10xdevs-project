# API Endpoint Implementation Plan: Generate Flashcards

## 1. Endpoint Overview

The **Generate Flashcards** endpoint accepts user-provided text and leverages OpenAI's GPT-4o-mini model to automatically generate flashcard proposals. This endpoint is a core feature of the FlashCard AI MVP, designed to dramatically reduce the time required to create learning materials.

**Key Characteristics:**
- **Stateless Operation**: Does not persist generated flashcards to the database
- **Fair Quota Enforcement**: Validates daily generation limits (10 per 24-hour period) without consuming quota until generation succeeds
- **User Verification Workflow**: Returns ephemeral data to a "Staging Area" for user review and approval
- **AI-Powered**: Uses OpenAI GPT-4o-mini with Responses API for content generation
- **Data Accuracy**: Records actual flashcard counts (not estimates) in generation logs

**Business Logic Flow:**
1. Authenticate user via JWT token
2. Validate input text (max 5000 characters)
3. Check user's daily quota via database RPC (read-only operation)
4. Send text to OpenAI API for flashcard generation
5. Record successful generation and consume quota with actual count
6. Return generated flashcards, generation_id for metrics tracking, and remaining quota to client

---

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
```
/api/generate-flashcards
```

### Required Headers
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Parameters

#### Path Parameters
None

#### Query Parameters
None

#### Request Body (JSON)
```json
{
  "text": "Notes text to process (max 5000 chars)..."
}
```

**Body Schema:**
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `text` | `string` | Yes | Min: 1 char, Max: 5000 chars | User-provided notes or content to be converted into flashcards |

**Validation Rules:**
- `text` field must be present and non-empty
- `text` length must not exceed 5000 characters
- `text` should be sanitized to prevent prompt injection attacks
- Request body must be valid JSON

### Example Request
```http
POST /api/generate-flashcards HTTP/1.1
Host: flashcard-ai.app
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "text": "The Renaissance was a period in European history marking the transition from the Middle Ages to modernity. It began in Italy in the 14th century and spread throughout Europe. Key characteristics included humanism, artistic innovation, and scientific inquiry."
}
```

---

## 3. Used Types

### DTOs (Data Transfer Objects)

#### GenerateFlashcardsCommand (Request)
```typescript
// Defined in: src/types.ts (lines 121-123)
export interface GenerateFlashcardsCommand {
  text: string;
}
```

**Usage:** Request payload validation and type safety

#### GenerateFlashcardsResponseDTO (Response)
```typescript
// Defined in: src/types.ts
export interface GenerateFlashcardsResponseDTO {
  flashcards: GeneratedFlashcardDTO[];
  generation_id: string;
  quota_remaining: number;
}
```

**Usage:** API response structure. The `generation_id` links saved flashcards back to their originating AI generation session for accurate metrics calculation (AI Acceptance Rate, Clean vs Edited Ratio).

#### GeneratedFlashcardDTO (Response Item)
```typescript
// Defined in: src/types.ts (lines 95-98)
export interface GeneratedFlashcardDTO {
  front: string;  // Question text
  back: string;   // Answer text
}
```

**Usage:** Individual flashcard proposal structure

### Validation Schemas

#### Request Validation Schema (Zod)
```typescript
import { z } from 'zod';

const GenerateFlashcardsRequestSchema = z.object({
  text: z
    .string()
    .min(1, 'Text cannot be empty')
    .max(5000, 'Text exceeds maximum length of 5000 characters')
    .trim()
});
```

**Validation Features:**
- Ensures text is a string
- Enforces minimum length (non-empty)
- Enforces maximum length (5000 chars)
- Trims whitespace

#### OpenAI Response Schema (Internal)
```typescript
const OpenAIFlashcardSchema = z.object({
  front: z.string().max(200, 'Question exceeds 200 characters'),
  back: z.string().max(500, 'Answer exceeds 500 characters')
});

const OpenAIResponseSchema = z.object({
  flashcards: z.array(OpenAIFlashcardSchema)
});
```

**Validation Features:**
- Validates OpenAI response structure
- Ensures front/back fields meet database constraints
- Protects against malformed AI responses

---

## 4. Response Details

### Success Response (200 OK)

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "flashcards": [
    {
      "front": "What historical period marked the transition from the Middle Ages to modernity?",
      "back": "The Renaissance"
    },
    {
      "front": "Where did the Renaissance begin and when?",
      "back": "The Renaissance began in Italy in the 14th century"
    },
    {
      "front": "What were the key characteristics of the Renaissance?",
      "back": "Humanism, artistic innovation, and scientific inquiry"
    }
  ],
  "generation_id": "550e8400-e29b-41d4-a716-446655440000",
  "quota_remaining": 7
}
```

**Response Schema:**
| Field | Type | Description |
|-------|------|-------------|
| `flashcards` | `GeneratedFlashcardDTO[]` | Array of generated flashcard proposals |
| `flashcards[].front` | `string` | Question text (max 200 chars) |
| `flashcards[].back` | `string` | Answer text (max 500 chars) |
| `generation_id` | `string` | UUID of the generation_log entry for metrics tracking |
| `quota_remaining` | `number` | Remaining generations available in current 24h period (0-10) |

### Error Responses

#### 400 Bad Request - Invalid Input
```json
{
  "error": "Validation failed",
  "details": {
    "text": ["Text exceeds maximum length of 5000 characters"]
  }
}
```

**Triggers:**
- Missing `text` field
- Empty `text` field
- `text` exceeds 5000 characters
- Invalid JSON structure

#### 401 Unauthorized - Authentication Failed
```json
{
  "error": "Unauthorized",
  "message": "Authentication required. Please provide a valid access token."
}
```

**Triggers:**
- Missing `Authorization` header
- Invalid JWT token format
- Expired JWT token
- Invalid signature

#### 403 Forbidden - Quota Exceeded
```json
{
  "error": "Quota exceeded",
  "message": "Daily generation limit reached (10/10). Quota resets in 8 hours.",
  "retry_after": 28800
}
```

**Triggers:**
- User has reached 10 generations in the current 24-hour period
- RPC `check_quota` indicates quota exceeded (before generation)
- RPC `record_generation` fails due to race condition (after generation)

#### 500 Internal Server Error - Server Failure
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred while processing your request. Please try again later."
}
```

**Triggers:**
- OpenAI API failure
- Database connection error
- RPC function execution error
- Unexpected application exceptions

#### 503 Service Unavailable - External Service Down
```json
{
  "error": "Service unavailable",
  "message": "AI generation service is temporarily unavailable. Please try again later."
}
```

**Triggers:**
- OpenAI API is down or rate-limited
- Network connectivity issues to OpenAI

---

## 5. Data Flow

### 5.1. Request Flow Diagram

```
[Client] 
   |
   | POST /api/generate-flashcards
   | Authorization: Bearer <token>
   | { text: "..." }
   |
   v
[Astro API Endpoint]
   |
   |--> [1] Extract JWT from Authorization header
   |
   |--> [2] Validate JWT with Supabase Auth
   |         |
   |         |--> FAIL: Return 401 Unauthorized
   |         |
   |         |--> SUCCESS: Extract user_id
   |
   |--> [3] Validate request body (Zod)
   |         |
   |         |--> FAIL: Return 400 Bad Request
   |         |
   |         |--> SUCCESS: Extract validated text
   |
   |--> [4] Check Quota (Read-Only)
   |         |
   |         v
   |    [Quota Service: checkQuota]
   |         |
   |         |--> [4a] Call RPC: check_quota()
   |         |         |
   |         |         v
   |         |    [Database RPC Function]
   |         |         |
   |         |         |--> Check last_reset_date
   |         |         |--> If >24h: Reset quota to 0 (no increment)
   |         |         |--> Check if quota < 10
   |         |         |--> Return: can_generate, quota_remaining, hours_until_reset
   |         |         |
   |         |<--------+
   |         |
   |         |--> FAIL (can_generate=false): Return 403 Forbidden
   |         |
   |         |--> SUCCESS (can_generate=true): Proceed to generation
   |         |
   |<--------+
   |
   |--> [5] Call OpenAI Service
   |         |
   |         v
   |    [OpenAI Service]
   |         |
   |         |--> [5a] Construct system prompt
   |         |--> [5b] Construct user prompt with sanitized text
   |         |--> [5c] Call OpenAI API (GPT-4o-mini)
   |         |         |
   |         |         v
   |         |    [OpenAI API]
   |         |         |
   |         |         |--> Generate flashcards
   |         |         |--> Return JSON response
   |         |         |
   |         |<--------+
   |         |
   |         |--> [5d] Automatic validation via zodTextFormat (200/500 char limits)
   |         |
   |         |--> FAIL: Return 500 or 503 error (quota NOT consumed)
   |         |
   |         |--> SUCCESS: Return flashcards array
   |         |
   |<--------+
   |
   |--> [6] Record Generation & Consume Quota
   |         |
   |         v
   |    [Quota Service: recordGeneration]
   |         |
   |         |--> [6a] Call RPC: record_generation(flashcards.length)
   |         |         |
   |         |         v
   |         |    [Database RPC Function]
   |         |         |
   |         |         |--> Increment quota with optimistic locking
   |         |         |--> Create generation_log entry with actual count
   |         |         |--> FAIL: Quota exceeded (race condition)
   |         |         |--> SUCCESS: Return generation_log_id, quota_remaining
   |         |         |
   |         |<--------+
   |         |
   |         |--> FAIL: Return 500 error (data integrity for metrics)
   |         |
   |         |--> SUCCESS: Return generation_log_id and updated quota information
   |         |
   |<--------+
   |
   |--> [7] Construct response
   |         |
   |         |--> Combine flashcards + generation_id + quota_remaining
   |         |
   |<--------+
   |
   v
[Return 200 OK with GenerateFlashcardsResponseDTO]
   |
   v
[Client receives flashcards with generation_id in Staging Area]
```

### 5.2. Database Interactions

The quota system uses two separate RPC functions for better data consistency and fairness:

#### RPC Call 1: `check_quota`
```sql
-- Function: check_quota()
-- Purpose: Check if user has available quota and perform lazy reset if needed
-- Returns: JSON { can_generate: BOOLEAN, quota_remaining: INTEGER, current_count: INTEGER, hours_until_reset: NUMERIC }
-- Side Effects: May reset quota if 24h passed, but does NOT increment counter
```

**Database Changes:**
1. **Read**: `profiles` table (current quota and reset date)
2. **Write** (conditional): `profiles` table (reset quota if >24h passed)

**Tables Modified:**
- `profiles`: Potentially resets `generations_count` to 0 and updates `last_reset_date` if 24+ hours passed
- **Does NOT**: Increment counter or create generation_log entry

#### RPC Call 2: `record_generation`
```sql
-- Function: record_generation(p_generated_count INTEGER)
-- Purpose: Record successful generation and consume quota with actual flashcard count
-- Returns: JSON { generation_log_id: UUID, generations_count: INTEGER, quota_remaining: INTEGER }
-- Throws: Exception if quota exceeded (handles race conditions via optimistic locking)
```

**Database Changes:**
1. **Read**: `profiles` table (for reset calculation)
2. **Write**: `profiles` table (increment `generations_count` with optimistic locking, update `last_generation_date`)
3. **Write**: `generation_logs` table (create new log entry with actual count)

**Tables Modified:**
- `profiles`: Increments `generations_count` (with revalidation), updates `last_generation_date`, `updated_at`
- `generation_logs`: Inserts new record with `user_id` and actual `generated_count` from OpenAI response

**Key Benefits:**
- Quota only consumed after successful generation
- Accurate flashcard counts in generation_logs (no estimates)
- Optimistic locking prevents race conditions
- Fair to users (no quota loss on system failures)
- Generation_id enables accurate metrics tracking (AI Acceptance Rate, Clean vs Edited Ratio)

### 5.3. External Service Interactions

#### OpenAI Responses API Integration

**Library:** `openai` (Official OpenAI TypeScript/Node SDK)

**Installation:**
```bash
npm install openai zod
```

**Why Responses API?**
The Responses API is the modern evolution of Chat Completions, offering:
- **Structured Outputs with Schema Adherence**: Guarantees responses match Zod schemas
- **Better Type Safety**: Native TypeScript support with automatic parsing
- **Simplified Error Handling**: Built-in handling for truncation and content filtering
- **`output_parsed` Helper**: Direct access to parsed objects without manual JSON parsing

**Client Initialization:**
```typescript
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY
});
```

**Zod Schema Definition:**
```typescript
const GeneratedFlashcard = z.object({
  front: z.string().max(200, 'Question exceeds 200 characters'),
  back: z.string().max(500, 'Answer exceeds 500 characters')
});

const FlashcardsResponse = z.object({
  flashcards: z.array(GeneratedFlashcard)
});
```

**API Call Implementation:**
```typescript
async function generateFlashcards(userText: string): Promise<GeneratedFlashcardDTO[]> {
  try {
    const response = await openai.responses.parse({
      model: 'gpt-4o-mini',
      input: `Generate educational flashcards from the following text. Create clear, specific questions that test key concepts and provide concise but complete answers.

Text to process:
${userText}

Requirements:
- Generate 3-8 flashcards depending on content length
- Questions should be specific and testable (avoid yes/no questions)
- Answers should be concise but complete
- Use proper grammar and punctuation
- Focus on the most important concepts
- Use the same language as used in the text`,
      text: {
        format: zodTextFormat(FlashcardsResponse, 'flashcards_response')
      },
      temperature: 0.7
    });

    // Access parsed output directly (type-safe)
    if (response.output_parsed) {
      return response.output_parsed.flashcards;
    }
    
    throw new Error('No parsed output received from OpenAI');
    
  } catch (error) {
    if (error instanceof OpenAI.LengthFinishReasonError) {
      throw new Error('Response truncated: content too long');
    } else if (error instanceof OpenAI.ContentFilterFinishReasonError) {
      throw new Error('Response blocked by content filter');
    }
    throw error;
  }
}
```

**Configuration:**
- **Model**: `gpt-4o-mini` (cost-effective, optimized for text generation)
- **Temperature**: `0.7` (balanced between creativity and consistency)
- **Structured Output**: Uses `zodTextFormat()` to enforce schema adherence
- **Schema Validation**: Automatic validation of character limits (200/500 chars)

**Key Differences from Chat Completions API:**

| Feature | Responses API (New) | Chat Completions API (Old) |
|---------|---------------------|---------------------------|
| Method | `responses.parse()` | `chat.completions.parse()` |
| Input | `input: string` | `messages: Array` |
| Structured Output | `text.format: zodTextFormat()` | `response_format: zodResponseFormat()` |
| Parsed Output | `response.output_parsed` | `message.parsed` |
| Error Handling | Built-in specific exceptions | Manual JSON parsing errors |

**Benefits for This Use Case:**
1. **Schema Enforcement**: Guarantees flashcards meet 200/500 character limits
2. **Type Safety**: Eliminates manual JSON parsing and validation
3. **Error Clarity**: Specific error types for truncation and filtering
4. **Simpler Code**: Direct access to parsed objects via `output_parsed`

---

## 6. Security Considerations

### 6.1. Authentication & Authorization

**Mechanism:** Supabase Auth with JWT tokens

**Implementation:**
1. Extract JWT from `Authorization: Bearer <token>` header
2. Verify token signature and expiration using Supabase client
3. Extract `user_id` from verified token
4. Use `user_id` for all subsequent operations

**Security Rules:**
- All requests MUST include valid JWT token
- Use HTTPS only in production

### 6.2. Input Validation & Sanitization

**Text Input Security:**
1. **Length Validation**: Enforce 5000 character limit

2. **Content Sanitization**: 
   - Trim whitespace
   - Remove or escape potentially dangerous characters
   - Prevent prompt injection attacks

3. **Zod Schema Validation**:
   - Validate all input types
   - Reject malformed requests early
   - Provide clear error messages

**Prompt Injection Prevention:**
- Use clear system prompts that define expected behavior
- Sanitize user input before including in prompts
- Validate OpenAI output format and content
- Limit output token count

### 6.3. Quota Protection

**Race Condition Prevention:**
- Two-phase quota system: check (read-only) → generate → record (with locking)
- Optimistic locking in `record_generation` revalidates quota during update
- `WHERE generations_count < 10` ensures concurrent requests don't exceed quota
- Failed recording doesn't lose user's generated flashcards (graceful degradation)

**Architecture Benefits:**
- Quota consumed only after successful generation
- No quota loss on OpenAI failures
- Accurate analytics data
- Fair user experience

### 6.4. CORS Configuration

**Setup:**
- Configure allowed origins in Astro config
- Restrict to production domain in production
- Allow localhost in development only

---

## 7. Error Handling

### 7.1. Error Hierarchy

```
Error Types:
├── ValidationError (400)
│   ├── MissingFieldError
│   ├── InvalidLengthError
│   └── InvalidFormatError
│
├── AuthenticationError (401)
│   ├── MissingTokenError
│   ├── InvalidTokenError
│   └── ExpiredTokenError
│
├── AuthorizationError (403)
│   └── QuotaExceededError
│
├── ExternalServiceError (503)
│   ├── OpenAIUnavailableError
│   └── OpenAIRateLimitError
│
└── InternalError (500)
    ├── DatabaseError
    ├── OpenAIParseError
    └── UnexpectedError
```

### 7.2. Error Handling Strategy

#### Validation Errors (400)

**Causes:**
- Missing `text` field
- Empty `text` field
- Text exceeds 5000 characters
- Invalid JSON structure

**Handling:**
```typescript
try {
  const validatedData = GenerateFlashcardsRequestSchema.parse(requestBody);
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: 'Validation failed',
        details: error.flatten().fieldErrors
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**Client Action:** Display validation errors to user, allow correction

#### Authentication Errors (401)

**Causes:**
- Missing Authorization header
- Invalid JWT format
- Expired token
- Invalid signature

**Handling:**
```typescript
const token = request.headers.get('Authorization')?.replace('Bearer ', '');
if (!token) {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: 'Authentication required. Please provide a valid access token.'
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}

// Verify token with Supabase
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid or expired access token.'
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Client Action:** Redirect to login page, refresh token if available

#### Quota Exceeded (403)

**Causes:**
- User has reached 10 generations in current 24-hour period (detected at check phase)

**Handling:**
```typescript
// Phase 1: Check quota before generation
const quotaStatus = await checkQuota(supabase, userId);

if (!quotaStatus.canGenerate) {
  const retryAfterSeconds = Math.ceil(quotaStatus.hoursUntilReset * 3600);
  
  return new Response(
    JSON.stringify({
      error: 'Quota exceeded',
      message: `Daily generation limit reached (10/10). Quota resets in ${quotaStatus.hoursUntilReset.toFixed(1)} hours.`,
      retry_after: retryAfterSeconds
    }),
    { 
      status: 403,
      headers: { 
        'Content-Type': 'application/json',
        'Retry-After': retryAfterSeconds.toString()
      }
    }
  );
}

// Phase 2: After successful generation, record it
try {
  const result = await recordGeneration(supabase, userId, flashcards.length);
  return { 
    flashcards, 
    generation_id: result.generationLogId,
    quota_remaining: result.quotaRemaining 
  };
} catch (error) {
  if (error instanceof QuotaExceededError || error instanceof QuotaServiceError) {
    // Recording failed - return 500 error to maintain data integrity
    // Without generation_id, we can't properly track metrics
    console.error('Failed to record generation:', error.message);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to record generation. Please try again.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**Client Action:** Display countdown timer, disable generation button

#### OpenAI Service Errors (503)

**Causes:**
- OpenAI API is down
- OpenAI rate limits exceeded
- Network connectivity issues

**Handling:**
```typescript
try {
  const flashcards = await generateFlashcardsWithOpenAI(text);
} catch (error) {
  if (error.response?.status === 429) {
    // OpenAI rate limit
    return new Response(
      JSON.stringify({
        error: 'Service unavailable',
        message: 'AI generation service is temporarily rate-limited. Please try again in a few moments.'
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
    return new Response(
      JSON.stringify({
        error: 'Service unavailable',
        message: 'AI generation service is temporarily unavailable. Please try again later.'
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**Client Action:** Show retry button, suggest trying again later

#### Internal Server Errors (500)

**Causes:**
- Database connection errors
- RPC function failures
- OpenAI response parsing errors
- Unexpected exceptions

**Handling:**
```typescript
try {
  // Main logic
} catch (error) {
  // Log detailed error server-side
  console.error('Error in generate-flashcards endpoint:', {
    error: error.message,
    stack: error.stack,
    userId,
    timestamp: new Date().toISOString()
  });
  
  // Return generic error to client
  return new Response(
    JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request. Please try again later.'
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Client Action:** Show error message, provide retry option

### 7.3. Logging Strategy

**Server-Side Logging:**
```typescript
// Log all errors with context
logger.error('Generate flashcards failed', {
  userId,
  textLength: text.length,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});

// Log successful generations for monitoring
logger.info('Flashcards generated successfully', {
  userId,
  flashcardsCount: flashcards.length,
  quotaRemaining: quota_remaining,
  timestamp: new Date().toISOString()
});
```

**Monitoring Metrics:**
- Success rate
- Error rate by type
- Average response time
- OpenAI API latency
- Quota usage patterns

---

## 8. Performance Considerations

### 8.1. Bottlenecks & Optimization

#### Bottleneck 1: OpenAI API Latency
**Issue:** External API calls can take 2-10 seconds

**Optimizations:**
1. **Streaming Response** (Future Enhancement):
   - Stream flashcards as they're generated
   - Improve perceived performance
   
2. **Caching** (Not applicable for this endpoint):
   - Each generation is unique user content
   
3. **Timeout Configuration**:
   - Set reasonable timeout (e.g., 30 seconds)
   - Fail fast if OpenAI is unresponsive

#### Bottleneck 2: Database RPC Calls
**Issue:** Quota operations add database round-trips

**Optimizations:**
1. **Two-Phase Design**:
   - `check_quota` is lightweight (read-mostly, only writes for reset)
   - `record_generation` runs after successful generation (no wasted calls)
   - Total round-trips: 2 (acceptable for fairness gained)
   
2. **Connection Pooling**:
   - Reuse Supabase client connections
   - Configure appropriate pool size

3. **Indexing**:
   - Ensure `profiles.id` is indexed (primary key)
   - Optimize RPC function queries

**Trade-off Analysis:**
- Extra DB call (check + record vs single call) is acceptable
- Benefits: Fair quota consumption, accurate data, no quota loss on failures
- Performance impact minimal compared to OpenAI API latency (2-10s)

#### Bottleneck 3: JWT Validation
**Issue:** Token verification on every request

**Optimizations:**
1. **Supabase Client Caching**:
   - Reuse Supabase client instance
   - Avoid recreating client per request
   
2. **Token Caching** (Future Enhancement):
   - Cache validated tokens temporarily
   - Balance security vs performance

### 8.2. Concurrent Request Handling

**Database Race Conditions:**
- Two-phase quota system minimizes critical section
- `check_quota` is read-mostly (only writes for reset)
- `record_generation` uses optimistic locking (`WHERE generations_count < 10`)
- Race conditions handled gracefully: user gets flashcards even if recording fails
- No quota bypass possible due to revalidation during update

**Race Condition Example:**
```
User has 1 quota left, makes 2 parallel requests:
1. Request A: check_quota() → can_generate=true
2. Request B: check_quota() → can_generate=true
3. Request A: generate flashcards → success
4. Request B: generate flashcards → success
5. Request A: record_generation() → success (quota=10)
6. Request B: record_generation() → fails (quota already 10)
7. Request B still returns flashcards to user (logged warning)
```

**OpenAI Rate Limits:**
- Monitor OpenAI account limits
- Implement backoff strategy for rate limit errors
- Consider request queuing if limits approached

---

## 9. Implementation Steps

### Step 1: Environment Setup
**Tasks:**
1. Add OpenAI API key to environment variables
   - Create `.env` file in project root (if not exists)
   - Add: `OPENAI_API_KEY=sk-...`
   - Add to `.gitignore` to prevent accidental commits
   - Document in README or `.env.example`

2. Install dependencies (if not already installed)
   ```bash
   npm install openai zod
   ```

**Validation:**
- Verify environment variable is accessible: `import.meta.env.OPENAI_API_KEY`
- Confirm OpenAI package is installed

---

### Step 2: Create Validation Schemas
**File:** `src/lib/validators/generate-flashcards.validator.ts`

**Tasks:**
1. Create Zod schema for request validation
   ```typescript
   import { z } from 'zod';
   
   export const GenerateFlashcardsRequestSchema = z.object({
     text: z.string().min(1).max(5000).trim()
   });
   ```

2. Create Zod schema for OpenAI structured output (reused in Step 3 - no duplication)
   ```typescript
   // Schema for individual flashcard (enforces database constraints)
   export const GeneratedFlashcardSchema = z.object({
     front: z.string().max(200, 'Question exceeds 200 characters'),
     back: z.string().max(500, 'Answer exceeds 500 characters')
   });
   
   // Schema for complete OpenAI response structure
   // This schema will be imported and used in the OpenAI service
   export const FlashcardsResponseSchema = z.object({
     flashcards: z.array(GeneratedFlashcardSchema)
   });
   ```
   
   **Note:** This schema is exported and reused in the OpenAI service (Step 3) to avoid duplication and maintain a single source of truth for validation rules.

3. Export type helpers
   ```typescript
   export type ValidatedGenerateRequest = z.infer<typeof GenerateFlashcardsRequestSchema>;
   export type ValidatedFlashcardsResponse = z.infer<typeof FlashcardsResponseSchema>;
   ```

---

### Step 3: Implement OpenAI Service
**File:** `src/lib/services/openai.service.ts`

**Tasks:**
1. Import required dependencies (including the schema from Step 2)
   ```typescript
   import OpenAI from 'openai';
   import { zodTextFormat } from 'openai/helpers/zod';
   import type { GeneratedFlashcardDTO } from '@/types';
   // Import the schema defined in Step 2 - avoid duplication
   import { FlashcardsResponseSchema } from '@/lib/validators/generate-flashcards.validator';
   ```
   
   **Important:** Use the imported `FlashcardsResponseSchema` from validators instead of defining a new schema here. This ensures a single source of truth for validation rules.

2. Create OpenAI client instance
   ```typescript
   const openai = new OpenAI({
     apiKey: import.meta.env.OPENAI_API_KEY
   });
   ```

3. Implement `generateFlashcards` function using Responses API
   ```typescript
   export async function generateFlashcards(text: string): Promise<GeneratedFlashcardDTO[]> {
     try {
       // Sanitize user input (trim, basic validation)
       const sanitizedText = text.trim();
       
       // Call OpenAI Responses API with imported schema for structured output
       const response = await openai.responses.parse({
         model: 'gpt-4o-mini',
         input: `Generate educational flashcards from the following text. Create clear, specific questions that test key concepts and provide concise but complete answers.

    Text to process:
    ${sanitizedText}

    Requirements:
    - Generate 3-8 flashcards depending on content length
    - Questions should be specific and testable (avoid yes/no questions)
    - Answers should be concise but complete
    - Use proper grammar and punctuation
    - Focus on the most important concepts
    - Front text must be max 200 characters
    - Back text must be max 500 character
    - Use the same language as used in the text`,
          text: {
            format: zodTextFormat(FlashcardsResponseSchema, 'flashcards_response')
          },
          temperature: 0.7
        });
       
       // Access type-safe parsed output
       if (response.output_parsed) {
         return response.output_parsed.flashcards;
       }
       
       throw new Error('No parsed output received from OpenAI');
       
     } catch (error) {
       // Handle specific OpenAI errors
       if (error instanceof OpenAI.LengthFinishReasonError) {
         throw new OpenAIServiceError('Response truncated: content too long');
       } else if (error instanceof OpenAI.ContentFilterFinishReasonError) {
         throw new OpenAIServiceError('Response blocked by content filter');
       } else if (error instanceof OpenAI.APIError) {
         throw new OpenAIServiceError(`OpenAI API error: ${error.message}`);
       }
       
       // Log unexpected errors for debugging
       console.error('Unexpected error in generateFlashcards:', error);
       throw new OpenAIServiceError('Failed to generate flashcards');
     }
   }
   ```

4. Create custom error class
   ```typescript
   export class OpenAIServiceError extends Error {
     constructor(message: string) {
       super(message);
       this.name = 'OpenAIServiceError';
     }
   }
   ```

**Key Advantages of Responses API:**
- **Automatic Schema Validation**: Zod schema ensures 200/500 character limits
- **Type Safety**: `output_parsed` provides typed access without manual JSON parsing
- **Built-in Error Handling**: Specific error types for truncation and content filtering
- **Simpler Code**: No need for manual JSON parsing or validation

---

### Step 4: Implement Quota Service
**File:** `src/lib/services/quota.service.ts`

**Tasks:**
1. Implement `checkQuota` function (read-only)
   ```typescript
   export async function checkQuota(
     supabase: SupabaseClient,
     userId: string
   ): Promise<{
     canGenerate: boolean;
     quotaRemaining: number;
     currentCount: number;
     hoursUntilReset: number;
   }>
   ```
   - Call Supabase RPC: `check_quota()`
   - No parameters (uses auth.uid() internally)
   - Parse returned quota status
   - No side effects on quota counter

2. Implement `recordGeneration` function (consumes quota)
   ```typescript
   export async function recordGeneration(
     supabase: SupabaseClient,
     userId: string,
     generatedCount: number
   ): Promise<{
     generationLogId: string;
     quotaRemaining: number;
     generationsCount: number;
   }>
   ```
   - Call Supabase RPC: `record_generation(p_generated_count)`
   - Pass actual flashcard count from OpenAI
   - Handle optimistic locking failures (race conditions)
   - Parse returned generation_log_id and updated quota

3. Implement error handling
   - Create custom `QuotaExceededError` with `hoursUntilReset` property
   - Create custom `QuotaServiceError` for database errors
   - Handle race conditions gracefully in `recordGeneration`
   - Validate input parameters

---

### Step 5: Create API Endpoint
**File:** `src/pages/api/generate-flashcards.ts`

**Tasks:**
1. Set up Astro API route structure
   ```typescript
   export const prerender = false;
   
   export async function POST(context: APIContext): Promise<Response>
   ```

2. Implement authentication
   - Extract JWT from Authorization header
   - Verify token with Supabase (`supabase.auth.getUser()`)
   - Extract user_id from verified token
   - Return 401 if authentication fails

3. Implement request validation
   - Parse request body as JSON
   - Validate with GenerateFlashcardsRequestSchema
   - Return 400 if validation fails

4. Implement business logic flow
   ```typescript
   // 1. Check quota (read-only, no consumption)
   const quotaStatus = await checkQuota(supabase, userId);
   
   if (!quotaStatus.canGenerate) {
     // Return 403 with retry-after header
     return new Response(JSON.stringify({
       error: 'Quota exceeded',
       message: `Daily generation limit reached (10/10). Quota resets in ${quotaStatus.hoursUntilReset.toFixed(1)} hours.`,
       retry_after: Math.ceil(quotaStatus.hoursUntilReset * 3600)
     }), {
       status: 403,
       headers: { 
         'Content-Type': 'application/json',
         'Retry-After': Math.ceil(quotaStatus.hoursUntilReset * 3600).toString()
       }
     });
   }
   
   // 2. Generate flashcards
   const flashcards = await generateFlashcards(validatedText);
   
   // 3. Record generation and consume quota
   try {
     const result = await recordGeneration(supabase, userId, flashcards.length);
     
     // 4. Return successful response with generation_id for metrics tracking
     return new Response(JSON.stringify({ 
       flashcards,
       generation_id: result.generationLogId,
       quota_remaining: result.quotaRemaining 
     }), {
       status: 200,
       headers: { 'Content-Type': 'application/json' }
     });
   } catch (error) {
     // Handle recording failures
     // Without generation_id, we can't properly track metrics, so return error
     if (error instanceof QuotaExceededError || error instanceof QuotaServiceError) {
       console.error('Failed to record generation:', error.message);
       return new Response(JSON.stringify({
         error: 'Internal server error',
         message: 'Failed to record generation. Please try again.'
       }), {
         status: 500,
         headers: { 'Content-Type': 'application/json' }
       });
     }
     throw error; // Re-throw other errors
   }
   ```

5. Implement comprehensive error handling
   - Wrap in try-catch blocks
   - Handle specific error types
   - Return appropriate status codes
   - Log errors server-side

6. Add response headers
   - `Content-Type: application/json`
   - CORS headers if needed

---

### Step 6: Create Database RPC Functions
**File:** `supabase/migrations/20260113100000_refactor_quota_system.sql`

**Tasks:**
1. Remove old `check_and_reset_quota` function
   ```sql
   DROP FUNCTION IF EXISTS public.check_and_reset_quota(integer);
   ```

2. Create `check_quota` RPC function (read-only check)
   - Returns JSON with: `can_generate`, `quota_remaining`, `current_count`, `hours_until_reset`
   - Performs lazy reset if 24+ hours passed (resets counter to 0)
   - Does NOT increment quota or create generation_log
   - Uses `auth.uid()` to get user_id from JWT context

3. Create `record_generation` RPC function (consumes quota)
   - Accepts parameter: `p_generated_count` (actual flashcard count)
   - Returns JSON with: `generation_log_id`, `generations_count`, `quota_remaining`
   - Uses optimistic locking: `WHERE generations_count < 10`
   - Creates generation_log entry with actual count
   - Throws exception if quota exceeded (handles race conditions)

**Expected RPC Signatures:**
```sql
-- Function 1: Check quota (read-only)
CREATE OR REPLACE FUNCTION public.check_quota()
RETURNS JSON
AS $$
RETURN json_build_object(
  'can_generate', v_can_generate,
  'quota_remaining', v_quota_remaining,
  'current_count', v_current_count,
  'hours_until_reset', v_hours_until_reset
);
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function 2: Record generation (consumes quota)
CREATE OR REPLACE FUNCTION public.record_generation(p_generated_count INTEGER)
RETURNS JSON
AS $$
-- Uses optimistic locking for race condition protection
UPDATE profiles 
SET generations_count = generations_count + 1
WHERE id = v_user_id AND generations_count < 10
RETURNING generations_count INTO v_new_count;

RETURN json_build_object(
  'generation_log_id', v_log_id,
  'generations_count', v_new_count,
  'quota_remaining', 10 - v_new_count
);
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

**Validation:**
- Test `check_quota` via Supabase SQL editor
- Verify lazy reset works after 24 hours
- Test `record_generation` with actual counts
- Verify optimistic locking prevents race conditions
- Confirm generation_logs entries have accurate counts

---

### Step 7: Documentation

**Tasks:**
1. Update API documentation
   - Add endpoint details to README or API docs
   - Document request/response formats
   - Provide example curl commands

2. Add inline code comments
   - Document complex logic
   - Explain security measures
   - Note performance considerations

3. Create developer guide section
   - How to set up OpenAI API key
   - How to test the endpoint locally
   - Troubleshooting common issues

4. Update environment variables documentation
   - Add OPENAI_API_KEY to .env.example
   - Document required Supabase configuration

---

### Step 9: Monitoring & Logging Setup

**Tasks:**
1. Implement structured logging
   - Log successful generations
   - Log all errors with context
   - Include user_id, timestamp, and relevant data

2. Review log retention policies
   - Ensure logs don't contain sensitive data
   - Configure log rotation

---

## 12. Appendix

### A. OpenAI Responses API Implementation Example

#### Complete Implementation with Zod Schema

```typescript
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY
});

// Define Zod schema for structured output
const GeneratedFlashcard = z.object({
  front: z.string().max(200, 'Question exceeds 200 characters'),
  back: z.string().max(500, 'Answer exceeds 500 characters')
});

const FlashcardsResponse = z.object({
  flashcards: z.array(GeneratedFlashcard)
});

// Generate flashcards function
async function generateFlashcards(userText: string) {
  try {
    const response = await openai.responses.parse({
      model: 'gpt-4o-mini',
      input: `Generate educational flashcards from the following text. Create clear, specific questions that test key concepts and provide concise but complete answers.

Text to process:
${userText}

Requirements:
- Generate 3-8 flashcards depending on content length
- Questions should be specific and testable (avoid yes/no questions)
- Answers should be concise but complete
- Use proper grammar and punctuation
- Focus on the most important concepts
- Front text must be max 200 characters
- Back text must be max 500 characters
- Use the same language as used in the text`,
      text: {
        format: zodTextFormat(FlashcardsResponse, 'flashcards_response')
      },
      temperature: 0.7
    });

    // Access type-safe parsed output
    if (response.output_parsed) {
      return response.output_parsed.flashcards;
    }
    
    throw new Error('No parsed output received from OpenAI');
    
  } catch (error) {
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.LengthFinishReasonError) {
      throw new Error('Response truncated: content too long');
    } else if (error instanceof OpenAI.ContentFilterFinishReasonError) {
      throw new Error('Response blocked by content filter');
    }
    
    // Re-throw other errors
    throw error;
  }
}
```

#### Input Prompt Guidelines

**Single Input Parameter:** The Responses API uses a single `input` parameter instead of separate system/user messages. Combine instructions and user content in one clear prompt.

**Prompt Structure:**
1. **Task Description**: Clearly state what you want the model to do
2. **Context**: Provide the user's text to process
3. **Requirements**: List specific constraints and formatting rules
4. **Quality Guidelines**: Specify desired output characteristics

**Key Differences from Chat Completions:**
- No separate `system` and `user` roles
- Instructions and content combined in single `input`
- Schema enforced via `zodTextFormat()` instead of `response_format`
- Output automatically parsed and validated against Zod schema

### B. Database RPC Functions Example

#### Function 1: check_quota (Read-Only Check)

```sql
CREATE OR REPLACE FUNCTION public.check_quota()
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID;
  v_current_count INTEGER;
  v_last_reset TIMESTAMPTZ;
  v_hours_since_reset NUMERIC;
  v_can_generate BOOLEAN;
  v_quota_remaining INTEGER;
BEGIN
  -- Get current user from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Fetch quota state
  SELECT generations_count, last_reset_date
  INTO v_current_count, v_last_reset
  FROM public.profiles
  WHERE id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Calculate hours since reset
  v_hours_since_reset := EXTRACT(EPOCH FROM (NOW() - v_last_reset)) / 3600;
  
  -- Lazy reset if 24+ hours passed (only resets counter, doesn't increment)
  IF v_hours_since_reset >= 24 THEN
    UPDATE public.profiles
    SET generations_count = 0,
        last_reset_date = NOW(),
        updated_at = NOW()
    WHERE id = v_user_id;
    
    v_current_count := 0;
  END IF;
  
  -- Determine quota status
  v_can_generate := v_current_count < 10;
  v_quota_remaining := 10 - v_current_count;
  
  -- Return quota information
  RETURN json_build_object(
    'can_generate', v_can_generate,
    'quota_remaining', v_quota_remaining,
    'current_count', v_current_count,
    'hours_until_reset', CASE 
      WHEN v_hours_since_reset >= 24 THEN 24.0
      ELSE ROUND((24 - v_hours_since_reset)::NUMERIC, 1)
    END
  );
END;
$$;
```

#### Function 2: record_generation (Consumes Quota)

```sql
CREATE OR REPLACE FUNCTION public.record_generation(p_generated_count INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID;
  v_generation_log_id UUID;
  v_new_count INTEGER;
  v_quota_remaining INTEGER;
  v_last_reset TIMESTAMPTZ;
  v_hours_since_reset NUMERIC;
BEGIN
  -- Get current user from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_generated_count <= 0 THEN
    RAISE EXCEPTION 'Generated count must be positive, got: %', p_generated_count;
  END IF;
  
  -- Get reset time for error messages
  SELECT last_reset_date INTO v_last_reset
  FROM public.profiles
  WHERE id = v_user_id;
  
  v_hours_since_reset := EXTRACT(EPOCH FROM (NOW() - v_last_reset)) / 3600;
  
  -- Update quota with optimistic locking (revalidates quota)
  -- This prevents race conditions
  UPDATE public.profiles
  SET generations_count = generations_count + 1,
      last_generation_date = NOW(),
      updated_at = NOW()
  WHERE id = v_user_id
    AND generations_count < 10  -- Optimistic lock: revalidate quota
  RETURNING generations_count INTO v_new_count;
  
  -- Check if update succeeded
  IF NOT FOUND THEN
    -- Quota exceeded (possibly due to race condition)
    RAISE EXCEPTION 'Daily generation limit reached (10/10). Quota resets in % hours.',
      ROUND(24 - v_hours_since_reset, 1);
  END IF;
  
  -- Create generation log with ACTUAL count
  INSERT INTO public.generation_logs (user_id, generated_count)
  VALUES (v_user_id, p_generated_count)
  RETURNING id INTO v_generation_log_id;
  
  v_quota_remaining := 10 - v_new_count;
  
  -- Return result
  RETURN json_build_object(
    'generation_log_id', v_generation_log_id,
    'generations_count', v_new_count,
    'quota_remaining', v_quota_remaining
  );
END;
$$;
```

**Key Architecture Benefits:**
- **Separation of Concerns**: Check doesn't consume, record consumes
- **Data Accuracy**: generation_logs has actual counts, not estimates
- **Fairness**: Quota only consumed on successful generation
- **Race Protection**: Optimistic locking in record_generation
- **Metrics Integrity**: Generation_id enables accurate tracking of AI acceptance rates and user edits
- **Data Integrity**: Failed recording returns error (500) to prevent inconsistent metrics

### C. TypeScript Type Definitions Reference

```typescript
// From src/types.ts

// Request Command Model
export interface GenerateFlashcardsCommand {
  text: string;
}

// Response DTO
export interface GenerateFlashcardsResponseDTO {
  flashcards: GeneratedFlashcardDTO[];
  generation_id: string;  // UUID for linking saved flashcards to generation session
  quota_remaining: number;
}

// Generated Flashcard DTO (ephemeral, not persisted)
export interface GeneratedFlashcardDTO {
  front: string;  // Max 200 chars
  back: string;   // Max 500 chars
}
```

### D. Error Response Examples

See Section 4 (Response Details) for comprehensive error response examples.

---

**Document Version:** 2.1  
**Last Updated:** 2026-01-14  
**Author:** Robert Zdanowski  
**Status:** Implemented ✅

**Major Changes in v2.1:**
- Added `generation_id` to response for accurate metrics tracking (AI Acceptance Rate, Clean vs Edited Ratio)
- Updated error handling: return 500 error instead of flashcards when recording fails (maintains data integrity)
- `generation_id` links saved flashcards back to their originating AI generation session

**Major Changes in v2.0:**
- Refactored quota system from single `check_and_reset_quota` to two-phase `check_quota` + `record_generation`
- Quota now consumed only after successful OpenAI generation (fair to users)
- Accurate flashcard counts in generation_logs (no estimates)
- Optimistic locking for race condition protection
- Implemented OpenAI Responses API with `zodTextFormat()` for structured outputs
- Enhanced error handling with graceful degradation for recording failures
