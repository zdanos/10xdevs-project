import type { APIRoute } from "astro";
import { fetchStudyQueueSchema } from "@/lib/validators/study.validator";
import { fetchStudyQueue, StudyServiceError } from "@/lib/services/study.service";

export const prerender = false;

/**
 * GET /api/study/queue?deck_id={uuid}&limit={number}
 * Retrieves flashcards due for review based on SM-2 scheduling
 *
 * Query parameters:
 * - deck_id (optional): UUID of the deck to filter flashcards
 * - limit (optional): Number of flashcards to return (default 20, max 100)
 *
 * @returns 200 with array of flashcards due for review (can be empty array)
 * @returns 400 for validation errors
 * @returns 500 for server errors
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    // Extract query parameters
    const params = {
      deck_id: url.searchParams.get("deck_id") || undefined,
      limit: url.searchParams.get("limit") || undefined,
    };

    // Validate query parameters
    const validationResult = fetchStudyQueueSchema.safeParse(params);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request parameters",
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

    // Use authenticated Supabase client from middleware
    const flashcards = await fetchStudyQueue(locals.supabase, validationResult.data);

    return new Response(JSON.stringify(flashcards), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[API /api/study/queue GET] Request failed:", {
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
        message: "An unexpected error occurred while fetching study queue",
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
