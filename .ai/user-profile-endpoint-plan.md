# API Endpoint Implementation Plan: Get User Profile & Quotas

## 1. Endpoint Overview

This endpoint retrieves the current authenticated user's profile information, specifically their AI generation quota statistics. It provides the frontend with data necessary to display remaining quota, usage statistics, and enable/disable the "Generate AI" button based on available quota.

**Purpose:**
- Fetch user's current generation count and quota limits
- Provide last generation and reset timestamps for UI display
- Enable client-side quota management without exposing sensitive profile data

**Endpoint Type:** Read-only (GET)

---

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
/api/profile
```

**Note:** The original API specification suggests `/rest/v1/profiles` (Supabase PostgREST endpoint), but this implementation uses a custom Astro endpoint at `/api/profile` to maintain consistency with the project's architecture pattern and enable better control over business logic.

### Authentication
- **Required:** Yes
- **Method:** JWT Bearer token via Supabase Auth
- **Header:** `Authorization: Bearer <access_token>`

### Parameters

#### Path Parameters
None

#### Query Parameters
None - The endpoint automatically fetches data for the authenticated user based on the JWT token.

#### Request Body
None (GET request)

---

## 3. Used Types

### Response DTO

**ProfileDTO** (already defined in `src/types.ts`)
```typescript
export type ProfileDTO = Pick<
  ProfileEntity, 
  "generations_count" | "last_generation_date" | "last_reset_date"
>;
```

### Type Structure
```typescript
{
  generations_count: number;          // Current count in the 24h cycle (0-10)
  last_generation_date: string | null; // ISO 8601 timestamp of last generation
  last_reset_date: string;            // ISO 8601 timestamp of last quota reset
}
```

### Command Models
None required (read-only endpoint with no input)

---

## 4. Response Details

### Success Response (200 OK)

**Status Code:** `200`

**Content-Type:** `application/json`

**Body:**
```json
{
  "generations_count": 5,
  "last_generation_date": "2026-01-15T14:30:00.000Z",
  "last_reset_date": "2026-01-15T00:00:00.000Z"
}
```

**Field Descriptions:**
- `generations_count`: Integer (0-10) representing how many AI generations the user has used in the current 24-hour cycle
- `last_generation_date`: ISO 8601 timestamp (nullable) of the most recent flashcard generation, or null if never generated
- `last_reset_date`: ISO 8601 timestamp of when the quota counter was last reset (occurs every 24 hours)

### Error Responses

#### 401 Unauthorized
Missing or invalid authentication token

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

#### 404 Not Found
User profile not found in database (rare edge case)

```json
{
  "error": "Not Found",
  "message": "User profile not found"
}
```

#### 500 Internal Server Error
Database query failure or unexpected server error

```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch user profile"
}
```

---

## 5. Data Flow

### Sequence Diagram

```
Client                 API Endpoint           Profile Service        Supabase DB
  |                         |                       |                     |
  |--GET /api/profile------>|                       |                     |
  |  + JWT Token            |                       |                     |
  |                         |                       |                     |
  |                         |--Extract user_id----->|                     |
  |                         |  from JWT             |                     |
  |                         |                       |                     |
  |                         |                       |--SELECT profile---->|
  |                         |                       |  WHERE id = user_id |
  |                         |                       |                     |
  |                         |                       |<--Profile data------|
  |                         |                       |                     |
  |                         |<--ProfileDTO----------|                     |
  |                         |                       |                     |
  |<--200 OK + JSON---------|                       |                     |
  |   ProfileDTO            |                       |                     |
```

### Step-by-Step Flow

1. **Request Reception**
   - Client sends GET request to `/api/profile`
   - Request includes JWT token in Authorization header

2. **Authentication** (TODO: To be implemented after auth system)
   - Middleware validates JWT token
   - Extract user_id from validated token
   - If invalid/missing token → Return 401

3. **Service Layer Call**
   - Call `getUserProfile(supabase, userId)` from profile.service.ts
   - Pass authenticated Supabase client and user_id

4. **Database Query**
   - Service queries `profiles` table:
     ```sql
     SELECT generations_count, last_generation_date, last_reset_date
     FROM profiles
     WHERE id = $userId
     ```
   - Supabase RLS policies enforce that users can only query their own profile

5. **Data Transformation**
   - Convert database response to ProfileDTO
   - Ensure timestamp fields are ISO 8601 formatted strings
   - Handle null last_generation_date appropriately

6. **Response**
   - Return 200 OK with ProfileDTO JSON
   - Include proper Content-Type header

---

## 6. Security Considerations

### Authentication & Authorization

1. **JWT Validation**
   - Verify JWT token signature and expiration
   - Extract user_id from token claims
   - **Implementation:** Handled by Supabase client with authenticated session

2. **Row-Level Security (RLS)**
   - Supabase RLS policies should enforce that users can only access their own profile
   - Policy: `auth.uid() = id` on profiles table for SELECT operations
   - **Note:** Current DB plan has RLS disabled (20260111100700_disable_all_policies.sql)
   - **Recommendation:** Re-enable RLS for profiles table before production

3. **Data Minimization**
   - Only return ProfileDTO fields (3 fields), not entire profile entity
   - Exclude sensitive fields like created_at, updated_at, id

### Threat Mitigation

| Threat | Mitigation Strategy |
|--------|---------------------|
| **Unauthorized Access** | Validate JWT token; return 401 if missing/invalid |
| **Profile Enumeration** | Never accept user_id as parameter; derive from JWT only |
| **Data Leakage** | Use ProfileDTO to restrict response to quota fields only |
| **Token Theft** | Use HTTPS only; short-lived tokens with refresh mechanism |
| **SQL Injection** | Use Supabase client parameterized queries (not raw SQL) |

### Rate Limiting
- **Consideration:** This endpoint will be called frequently (e.g., on every page load)
- **Recommendation:** Implement client-side caching (5-60 seconds) to reduce load

---

## 7. Error Handling

### Error Types and Handling Strategy

| Error Type | Status Code | Scenario | User Message |
|------------|-------------|----------|--------------|
| **Authentication Error** | 401 | Missing/invalid JWT token | "Authentication required" |
| **Profile Not Found** | 404 | User profile doesn't exist in DB | "User profile not found" |
| **Database Error** | 500 | Supabase query failure | "Failed to fetch user profile" |
| **Service Error** | 500 | Unexpected error in service layer | "Failed to fetch user profile" |
| **Unexpected Error** | 500 | Uncaught exceptions | "Failed to fetch user profile" |

### Error Handling Implementation

#### 1. Authentication Errors (401)
```typescript
// In endpoint handler (after auth implementation)
if (!userId) {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message: "Authentication required"
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 2. Profile Not Found (404)
```typescript
// In service layer
const { data: profile, error } = await supabase
  .from("profiles")
  .select("generations_count, last_generation_date, last_reset_date")
  .eq("id", userId)
  .single();

if (error?.code === "PGRST116") { // PostgREST "no rows" error
  throw new ProfileNotFoundError(`Profile not found for user: ${userId}`);
}
```

#### 3. Database Errors (500)
```typescript
// In service layer
if (error) {
  console.error("Database error fetching profile:", {
    userId,
    error: error.message,
    code: error.code,
    timestamp: new Date().toISOString()
  });
  throw new ProfileServiceError(`Database error: ${error.message}`);
}
```

#### 4. Logging Strategy
```typescript
// Structured error logging in endpoint handler
console.error("[API /api/profile GET] Request failed:", {
  error: error instanceof Error ? error.message : "Unknown error",
  userId: userId, // Only log after auth is implemented
  stack: error instanceof Error ? error.stack : undefined,
  timestamp: new Date().toISOString()
});
```

### Custom Error Classes

Define in `profile.service.ts`:
```typescript
export class ProfileServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileServiceError";
  }
}

export class ProfileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileNotFoundError";
  }
}
```

---

## 8. Performance Considerations

### Database Performance

1. **Query Optimization**
   - Use `.single()` instead of array result for single-row queries
   - Select only required fields (not `SELECT *`)
   - **Index:** Profiles table already indexed on `id` (primary key)

2. **Connection Pooling**
   - Supabase client handles connection pooling automatically
   - No additional configuration needed

### Response Time

- **Expected:** < 100ms (simple SELECT by primary key)
- **Target:** < 200ms including network overhead
- **Monitoring:** Log slow queries (> 500ms) for investigation

### Caching Strategy

#### Client-Side Caching
```typescript
// Recommendation for frontend
const CACHE_DURATION = 30_000; // 30 seconds
// Use SWR, React Query, or similar with staleTime configuration
```

**Rationale:**
- Quota data doesn't change frequently (only after generation)
- Reduces unnecessary API calls
- Improves perceived performance

#### Server-Side Caching
- **Not recommended initially** (adds complexity)

### Bottleneck Analysis

| Potential Bottleneck | Likelihood | Mitigation |
|---------------------|------------|------------|
| **High request volume** | Low (max ~1000 users for MVP) | Client-side caching |
| **Database connection limits** | Very Low (Supabase scales automatically) | Connection pooling (built-in) |
| **Network latency** | Medium (depends on user location) | Use CDN, enable compression |

---

## 9. Implementation Steps

### Step 1: Create Profile Service

**File:** `src/lib/services/profile.service.ts`

**Tasks:**
1. Create custom error classes (`ProfileServiceError`, `ProfileNotFoundError`)
2. Implement `getUserProfile()` function:
   - Accept `supabase` client and `userId` as parameters
   - Query profiles table with `.select()`, `.eq()`, and `.single()`
   - Handle "no rows" error → throw `ProfileNotFoundError`
   - Handle database errors → throw `ProfileServiceError`
   - Return ProfileDTO object
3. Add JSDoc comments with usage examples
4. Export error classes and service function

**Validation:**
- Input validation: Check `userId` is non-empty UUID format
- Error handling: Try-catch block with proper error re-throwing

---

### Step 2: Create API Endpoint

**File:** `src/pages/api/profile/index.ts`

**Tasks:**
1. Add `export const prerender = false;`
2. Implement `GET` handler:
   - Extract user_id from authentication (TODO comment for now)
   - Use temporary hardcoded userId or global supabaseClient for testing
   - Call `getUserProfile()` service function
   - Return 200 with ProfileDTO JSON
3. Implement error handling:
   - Catch `ProfileNotFoundError` → return 404
   - Catch `ProfileServiceError` → return 500
   - Catch unexpected errors → return 500
   - Log all errors with structured data
4. Add JSDoc documentation to handler

**Response Format:**
```typescript
return new Response(JSON.stringify(profile), {
  status: 200,
  headers: { "Content-Type": "application/json" }
});
```

---

### Step 3: Add Type Exports (Optional Verification)

**File:** `src/types.ts`

**Tasks:**
1. Verify `ProfileDTO` is already exported (no changes needed)
2. Ensure it picks correct fields: `generations_count`, `last_generation_date`, `last_reset_date`

---

### Step 4: Testing & Validation

**Manual Testing:**
1. **Positive Case:**
   - Make GET request to `/api/profile`
   - Verify 200 response with correct ProfileDTO structure
   - Verify timestamps are ISO 8601 formatted

2. **Error Cases:**
   - Test with non-existent user → verify 404 response
   - Test database connection failure → verify 500 response

3. **Data Validation:**
   - Verify `generations_count` is integer (0-10)
   - Verify `last_generation_date` can be null
   - Verify `last_reset_date` is never null

---

### Step 5: Documentation Updates

**Files to Update:**
1. **README.md** (if API documentation exists)
   - Add endpoint documentation
   - Include request/response examples

2. **API Plan** (`.ai/api-plan.md`)
   - Mark section 2.5 as implemented
   - Update URL from `/rest/v1/profiles` to `/api/profile`

---

## Implementation Checklist

- [ ] Step 1: Create `src/lib/services/profile.service.ts`
  - [ ] Define `ProfileServiceError` class
  - [ ] Define `ProfileNotFoundError` class
  - [ ] Implement `getUserProfile()` function
  - [ ] Add input validation
  - [ ] Add error handling
  - [ ] Add JSDoc comments

- [ ] Step 2: Create `src/pages/api/profile/index.ts`
  - [ ] Add `prerender = false` export
  - [ ] Implement GET handler
  - [ ] Add authentication TODO comment
  - [ ] Call profile service
  - [ ] Implement error handling for 401, 404, 500
  - [ ] Add structured error logging
  - [ ] Add JSDoc documentation

- [ ] Step 3: Verify `ProfileDTO` in `src/types.ts`
  - [ ] Confirm correct fields are exported

- [ ] Step 4: Manual Testing
  - [ ] Test successful profile fetch (200)
  - [ ] Test profile not found (404)
  - [ ] Test server error handling (500)
  - [ ] Verify response structure matches ProfileDTO

- [ ] Step 5: Documentation
  - [ ] Update API plan with new endpoint URL
  - [ ] Add usage examples

- [ ] Step 6: Code Review
  - [ ] Check linter errors and fix
  - [ ] Verify adherence to project coding standards
  - [ ] Review error handling completeness

---

## Notes for Implementation

1. **Authentication Placeholder:**
   - Since authentication is not yet implemented, use the global `supabaseClient` from `src/db/supabase.client.ts`
   - Add TODO comments indicating where auth should be integrated
   - Use a test user_id or skip userId validation temporarily

2. **Database Triggers:**
   - The `profiles` table should have triggers that auto-create a profile row when a user signs up
   - If not present, add in a future migration: `handle_new_user_profile_creation()`

3. **Consistency with Existing Code:**
   - Follow the exact same structure as `src/pages/api/decks/index.ts` and `src/pages/api/study/queue.ts`
   - Use identical error response format
   - Use same logging patterns

4. **Type Safety:**
   - Import `ProfileDTO` from `@/types`
   - Use TypeScript strict mode
   - Avoid `any` types

5. **URL Alignment:**
   - The specification says `/rest/v1/profiles` but implementation uses `/api/profile`
   - This is intentional to maintain consistency with the custom API layer
   - Document this divergence in the API plan

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-15  
**Author:** Robert Zdanowski  
**Status:** Ready for Implementation