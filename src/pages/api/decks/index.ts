import type { APIRoute } from "astro";
import { createDeckSchema } from "@/lib/validators/deck.validator";
import { listUserDecks, createDeck } from "@/lib/services/deck.service";
import { supabaseClient } from "@/db/supabase.client";

export const prerender = false;

/**
 * GET /api/decks
 * Retrieves all decks for the authenticated user
 *
 * @returns 200 with array of decks
 * @returns 500 for server errors
 */
export const GET: APIRoute = async () => {
  try {
    // For now, use the global supabase client
    // TODO: Replace with authenticated client from locals.supabase after auth implementation
    const decks = await listUserDecks(supabaseClient);

    return new Response(JSON.stringify(decks), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[API /api/decks GET] Request failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to fetch decks",
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
 * POST /api/decks
 * Creates a new deck for the authenticated user
 *
 * @returns 201 with created deck
 * @returns 400 for validation errors
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

    // Validate input with Zod schema
    const validationResult = createDeckSchema.safeParse(body);

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
    const deck = await createDeck(supabaseClient, validationResult.data);

    return new Response(JSON.stringify(deck), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[API /api/decks POST] Request failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to create deck",
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
