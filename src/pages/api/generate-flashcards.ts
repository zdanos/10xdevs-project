import type { APIContext } from "astro";
import { GenerateFlashcardsRequestSchema } from "@/lib/validators/generate-flashcards.validator";
import { generateFlashcards, OpenAIServiceError } from "@/lib/services/openai.service";
import { checkQuota, recordGeneration, QuotaExceededError, QuotaServiceError } from "@/lib/services/quota.service";
import type { GenerateFlashcardsResponseDTO } from "@/types";

/**
 * Disable pre-rendering for this API endpoint
 * This ensures the endpoint runs on-demand for each request
 */
export const prerender = false;

/**
 * POST /api/generate-flashcards
 *
 * Generates flashcard proposals from user-provided text using OpenAI's GPT-4o-mini model.
 * This is a stateless operation - generated flashcards are not persisted to the database.
 * They are returned to the client for user review and verification before saving.
 *
 * **Business Logic Flow:**
 * 1. Authenticate user from Supabase session
 * 2. Validate request body (text: 1-5000 characters)
 * 3. Check user's daily quota (10 generations per 24h) - no side effects
 * 4. Generate flashcards using OpenAI Responses API
 * 5. Record successful generation and consume quota with actual flashcard count
 * 6. Return flashcards with generation_id for metrics tracking and remaining quota
 *
 * **Authentication:**
 * Uses Supabase Auth session from authenticated client
 *
 * @param context - Astro API context containing request and locals
 * @returns Response with flashcards, generation_id, and quota information or error
 *
 * @example Success Response (200):
 * {
 *   "flashcards": [
 *     { "front": "Question?", "back": "Answer" }
 *   ],
 *   "generation_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "quota_remaining": 7
 * }
 *
 * @example Error Response (400):
 * {
 *   "error": "Validation failed",
 *   "details": { "text": ["Text exceeds maximum length of 5000 characters"] }
 * }
 */
export async function POST(context: APIContext): Promise<Response> {
  try {
    // ==========================================
    // STEP 1: AUTHENTICATION
    // ==========================================
    // Get authenticated user from Supabase client
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      console.error("[API /api/generate-flashcards POST] User not authenticated:", {
        authError: authError?.message,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required. Please log in.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const userId = user.id;

    // ==========================================
    // STEP 2: REQUEST VALIDATION
    // ==========================================
    let requestBody: unknown;

    try {
      requestBody = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON",
          message: "Request body must be valid JSON",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate request body with Zod schema
    const validationResult = GenerateFlashcardsRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { text } = validationResult.data;

    // ==========================================
    // STEP 3: QUOTA CHECK (Read-only)
    // ==========================================
    let quotaStatus;

    try {
      quotaStatus = await checkQuota(context.locals.supabase, userId);

      // Check if user can generate
      if (!quotaStatus.canGenerate) {
        // Calculate retry-after in seconds for HTTP header
        const retryAfterSeconds = Math.ceil(quotaStatus.hoursUntilReset * 3600);

        return new Response(
          JSON.stringify({
            error: "Quota exceeded",
            message: `Daily generation limit reached (10/10). Quota resets in ${quotaStatus.hoursUntilReset.toFixed(1)} hours.`,
            retry_after: retryAfterSeconds,
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": retryAfterSeconds.toString(),
            },
          }
        );
      }
    } catch (error) {
      if (error instanceof QuotaServiceError) {
        console.error("Quota check error:", {
          userId,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({
            error: "Internal server error",
            message: "Failed to check quota. Please try again later.",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Unexpected error during quota check
      console.error("Unexpected error during quota check:", {
        userId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "An unexpected error occurred. Please try again later.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // STEP 4: GENERATE FLASHCARDS
    // ==========================================
    let flashcards;

    try {
      flashcards = await generateFlashcards(text);
    } catch (error) {
      if (error instanceof OpenAIServiceError) {
        // Check if it's a service unavailability error
        if (error.message.includes("temporarily unavailable") || error.message.includes("rate-limited")) {
          return new Response(
            JSON.stringify({
              error: "Service unavailable",
              message: error.message,
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Other OpenAI errors (validation, parsing, etc.)
        console.error("OpenAI service error:", {
          userId,
          textLength: text.length,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({
            error: "Internal server error",
            message: "Failed to generate flashcards. Please try again later.",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Unexpected error during generation
      console.error("Unexpected error during flashcard generation:", {
        userId,
        textLength: text.length,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "An unexpected error occurred while processing your request. Please try again later.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // STEP 5: RECORD GENERATION & CONSUME QUOTA
    // ==========================================
    let recordResult;

    try {
      // Record the successful generation with actual flashcard count
      recordResult = await recordGeneration(context.locals.supabase, userId, flashcards.length);
    } catch (error) {
      // Handle quota exceeded from race condition (optimistic locking)
      if (error instanceof QuotaExceededError) {
        // This is a rare edge case: generation succeeded but quota was consumed
        // by another concurrent request between check and record.
        // Best UX: Return the flashcards anyway with a warning in logs
        console.warn("Race condition: Quota exceeded after generation succeeded:", {
          userId,
          flashcardsCount: flashcards.length,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        // Without a proper generation_id, we return an error instead of partial data
        // This ensures data integrity for metrics tracking
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            message: "Failed to record generation. Please try again.",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle database errors during recording
      if (error instanceof QuotaServiceError) {
        // Generation succeeded but we couldn't record it in the database
        // Return error to maintain data integrity for metrics
        console.error("Failed to record generation:", {
          userId,
          flashcardsCount: flashcards.length,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({
            error: "Internal server error",
            message: "Failed to record generation. Please try again.",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Unexpected error during recording
      console.error("Unexpected error recording generation:", {
        userId,
        flashcardsCount: flashcards.length,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to record generation. Please try again.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // STEP 6: CONSTRUCT RESPONSE
    // ==========================================
    const responseBody: GenerateFlashcardsResponseDTO = {
      flashcards,
      generation_id: recordResult.generationLogId,
      quota_remaining: recordResult.quotaRemaining,
    };

    // Log successful generation for monitoring
    console.log("Flashcards generated and recorded successfully:", {
      userId,
      flashcardsCount: flashcards.length,
      quotaRemaining: recordResult.quotaRemaining,
      generationLogId: recordResult.generationLogId,
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for any unexpected errors not handled above
    console.error("Unhandled error in generate-flashcards endpoint:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "An unexpected error occurred while processing your request. Please try again later.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
