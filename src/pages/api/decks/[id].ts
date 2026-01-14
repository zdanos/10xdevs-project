import type { APIRoute } from "astro";
import { deckIdSchema, updateDeckSchema } from "@/lib/validators/deck.validator";
import { updateDeck, deleteDeck, DeckServiceError } from "@/lib/services/deck.service";
import { supabaseClient } from "@/db/supabase.client";

export const prerender = false;

/**
 * PATCH /api/decks/[id]
 * Updates an existing deck's name
 *
 * @returns 200 with updated deck
 * @returns 400 for validation errors
 * @returns 404 if deck not found or access denied
 * @returns 500 for server errors
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    // Extract and validate deck ID from URL parameters
    const idValidation = deckIdSchema.safeParse(params.id);

    if (!idValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid deck ID format",
          details: [
            {
              field: "id",
              message: "Invalid deck ID format",
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

    const deckId = idValidation.data;

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
    const validationResult = updateDeckSchema.safeParse(body);

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
    const deck = await updateDeck(supabaseClient, deckId, validationResult.data);

    return new Response(JSON.stringify(deck), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle deck not found error
    if (error instanceof DeckServiceError && error.message.includes("not found or access denied")) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Deck not found or access denied",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.error("[API /api/decks/[id] PATCH] Request failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      deckId: params.id,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to update deck",
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
 * DELETE /api/decks/[id]
 * Deletes a deck and all associated flashcards
 *
 * @returns 204 No Content on success
 * @returns 400 for validation errors
 * @returns 404 if deck not found or access denied
 * @returns 500 for server errors
 */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    // Extract and validate deck ID from URL parameters
    const idValidation = deckIdSchema.safeParse(params.id);

    if (!idValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid deck ID format",
          details: [
            {
              field: "id",
              message: "Invalid deck ID format",
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

    const deckId = idValidation.data;

    // For now, use the global supabase client
    // TODO: Replace with authenticated client from locals.supabase after auth implementation
    await deleteDeck(supabaseClient, deckId);

    // Return 204 No Content on successful deletion
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Handle deck not found error
    if (error instanceof DeckServiceError && error.message.includes("not found or access denied")) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Deck not found or access denied",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.error("[API /api/decks/[id] DELETE] Request failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      deckId: params.id,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to delete deck",
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
