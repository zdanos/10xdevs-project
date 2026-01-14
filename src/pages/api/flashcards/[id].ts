import type { APIRoute } from "astro";
import { flashcardIdSchema, updateFlashcardSchema } from "@/lib/validators/flashcard.validator";
import { updateFlashcard, deleteFlashcard, FlashcardServiceError } from "@/lib/services/flashcard.service";
import { supabaseClient } from "@/db/supabase.client";

export const prerender = false;

/**
 * PATCH /api/flashcards/[id]
 * Updates a flashcard's content (front and/or back text)
 *
 * @returns 200 with updated flashcard
 * @returns 400 for validation errors
 * @returns 404 if flashcard not found or access denied
 * @returns 500 for server errors
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    // Extract and validate flashcard ID from URL parameters
    const idValidation = flashcardIdSchema.safeParse(params.id);

    if (!idValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid flashcard ID format",
          details: [
            {
              field: "id",
              message: "Invalid flashcard ID format",
            },
          ],
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const flashcardId = idValidation.data;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid JSON in request body",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Validate input with Zod schema
    const validationResult = updateFlashcardSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: firstError.message,
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // For now, use the global supabase client
    // TODO: Replace with authenticated client from locals.supabase after auth implementation
    const flashcard = await updateFlashcard(supabaseClient, flashcardId, validationResult.data);

    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle flashcard not found error
    if (error instanceof FlashcardServiceError && error.message.includes("not found or access denied")) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Flashcard not found or access denied",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.error("[API /api/flashcards/[id] PATCH] Request failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      flashcardId: params.id,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to update flashcard",
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

/**
 * DELETE /api/flashcards/[id]
 * Deletes a flashcard
 *
 * @returns 204 No Content on success
 * @returns 400 for validation errors
 * @returns 404 if flashcard not found or access denied
 * @returns 500 for server errors
 */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    // Extract and validate flashcard ID from URL parameters
    const idValidation = flashcardIdSchema.safeParse(params.id);

    if (!idValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid flashcard ID format",
          details: [
            {
              field: "id",
              message: "Invalid flashcard ID format",
            },
          ],
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const flashcardId = idValidation.data;

    // For now, use the global supabase client
    // TODO: Replace with authenticated client from locals.supabase after auth implementation
    await deleteFlashcard(supabaseClient, flashcardId);

    // Return 204 No Content on successful deletion
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Handle flashcard not found error
    if (error instanceof FlashcardServiceError && error.message.includes("not found or access denied")) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Flashcard not found or access denied",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.error("[API /api/flashcards/[id] DELETE] Request failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      flashcardId: params.id,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to delete flashcard",
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
