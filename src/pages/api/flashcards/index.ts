import type { APIRoute } from "astro";
import {
  deckIdQuerySchema,
  createFlashcardSchema,
  bulkCreateFlashcardsSchema,
} from "@/lib/validators/flashcard.validator";
import { listDeckFlashcards, createFlashcards, FlashcardServiceError } from "@/lib/services/flashcard.service";
import { supabaseClient } from "@/db/supabase.client";

export const prerender = false;

/**
 * GET /api/flashcards?deck_id={uuid}
 * Retrieves all flashcards for a specific deck
 *
 * @returns 200 with array of flashcards
 * @returns 400 for validation errors
 * @returns 500 for server errors
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    // Extract deck_id from query parameters
    const deckId = url.searchParams.get("deck_id");

    if (!deckId) {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "deck_id query parameter is required",
          details: [
            {
              field: "deck_id",
              message: "deck_id query parameter is required",
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

    // Validate deck_id format
    const validationResult = deckIdQuerySchema.safeParse(deckId);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: firstError.message,
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join(".") || "deck_id",
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
    const flashcards = await listDeckFlashcards(supabaseClient, validationResult.data);

    return new Response(JSON.stringify(flashcards), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[API /api/flashcards GET] Request failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to fetch flashcards",
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
 * POST /api/flashcards
 * Creates one or multiple flashcards in a deck
 * Supports both single object and array payload
 *
 * @returns 201 with created flashcard(s)
 * @returns 400 for validation errors
 * @returns 404 for deck not found
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

    // Detect if payload is array or single object
    const isArray = Array.isArray(body);

    // Apply appropriate validation schema
    const validationResult = isArray
      ? bulkCreateFlashcardsSchema.safeParse(body)
      : createFlashcardSchema.safeParse(body);

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
    const flashcards = await createFlashcards(supabaseClient, validationResult.data);

    return new Response(JSON.stringify(flashcards), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[API /api/flashcards POST] Request failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    // Handle service layer errors
    if (error instanceof FlashcardServiceError) {
      // Check if it's a "not found" error (FK constraint violation)
      if (error.message.includes("not found") || error.message.includes("access denied")) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: error.message,
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to create flashcard(s)",
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
