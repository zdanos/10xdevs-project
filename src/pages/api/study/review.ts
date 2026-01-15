import type { APIRoute } from "astro";
import { processReviewSchema } from "@/lib/validators/study.validator";
import { processReview, StudyServiceError } from "@/lib/services/study.service";
import { supabaseClient } from "@/db/supabase.client";

export const prerender = false;

/**
 * POST /api/study/review
 * Processes a flashcard review and updates its SM-2 state
 *
 * Request body:
 * - card_id (required): UUID of the flashcard being reviewed
 * - rating (required): User's recall quality rating ("again", "hard", "good", "easy")
 *
 * @returns 200 with updated flashcard SM-2 state
 * @returns 400 for validation errors or malformed JSON
 * @returns 404 if flashcard not found or access denied
 * @returns 500 for server errors
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          message: "Request body must be valid JSON",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Validate request body
    const validationResult = processReviewSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: validationResult.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Process the review
    let result;

    try {
      // For now, use the global supabase client
      // TODO: Replace with authenticated client from locals.supabase after auth implementation
      result = await processReview(supabaseClient, validationResult.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Check if it's a "not found" error
      if (errorMessage.includes("not found")) {
        return new Response(
          JSON.stringify({
            error: "Flashcard not found",
            message: "The requested flashcard does not exist or you do not have permission to access it",
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Re-throw to be handled by outer catch block
      throw error;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[API /api/study/review POST] Request failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle known service errors
    if (error instanceof StudyServiceError) {
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Handle unexpected errors
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "An unexpected error occurred while processing the review",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
