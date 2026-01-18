import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { DeckDTO, CreateDeckCommand, UpdateDeckCommand, ListDecksResponseDTO } from "../../types";
import { DEFAULT_USER_ID } from "../../db/supabase.client";

/**
 * Custom error class for deck service errors
 */
export class DeckServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckServiceError";
  }
}

/**
 * Retrieves all decks for the authenticated user with card counts
 * Decks are ordered by creation date (newest first)
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @returns Array of user's decks with card_count for each deck
 * @throws DeckServiceError if database query fails
 *
 * Used in: GET /api/decks
 *
 * @example
 * const decks = await listUserDecks(supabase);
 * // Returns: [{ id: "...", name: "History 101", card_count: 25, ... }, ...]
 */
export async function listUserDecks(supabase: SupabaseClient<Database>): Promise<ListDecksResponseDTO> {
  try {
    // Fetch decks with flashcard count using Supabase aggregation
    const { data, error } = await supabase
      .from("decks")
      .select("*, flashcards(count)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DeckService] Database error during listUserDecks:", {
        error: error.message,
        code: error.code,
        details: error.details,
        timestamp: new Date().toISOString(),
      });
      throw new DeckServiceError("Failed to fetch decks");
    }

    // Transform the response to include card_count as a number
    // Supabase returns flashcards as [{ count: number }], we need to extract it
    const decksWithCount = data.map((deck) => {
      const { flashcards, ...deckData } = deck;
      return {
        ...deckData,
        card_count: flashcards?.[0]?.count ?? 0,
      };
    });

    return decksWithCount;
  } catch (error) {
    // Re-throw known error types
    if (error instanceof DeckServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("[DeckService] Unexpected error in listUserDecks:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
    throw new DeckServiceError("Failed to fetch decks due to an unexpected error");
  }
}

/**
 * Retrieves a single deck by ID with card count
 * RLS policies ensure users can only access their own decks
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param id - UUID of the deck to retrieve
 * @returns The deck with card_count
 * @throws DeckServiceError if deck not found, access denied, or database query fails
 *
 * Used in: GET /api/decks/[id]
 *
 * @example
 * const deck = await getDeck(supabase, "deck-uuid");
 * // Returns: { id: "deck-uuid", name: "History 101", card_count: 25, ... }
 */
export async function getDeck(supabase: SupabaseClient<Database>, id: string): Promise<DeckDTO> {
  try {
    const { data, error } = await supabase.from("decks").select("*, flashcards(count)").eq("id", id).single();

    if (error) {
      console.error("[DeckService] Database error during getDeck:", {
        error: error.message,
        code: error.code,
        details: error.details,
        deckId: id,
        timestamp: new Date().toISOString(),
      });
      throw new DeckServiceError("Failed to fetch deck");
    }

    if (!data) {
      console.error("[DeckService] No data returned from getDeck:", {
        deckId: id,
        timestamp: new Date().toISOString(),
      });
      throw new DeckServiceError("Deck not found or access denied");
    }

    // Transform the response to include card_count as a number
    const { flashcards, ...deckData } = data;
    return {
      ...deckData,
      card_count: flashcards?.[0]?.count ?? 0,
    };
  } catch (error) {
    // Re-throw known error types
    if (error instanceof DeckServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("[DeckService] Unexpected error in getDeck:", {
      error: error instanceof Error ? error.message : "Unknown error",
      deckId: id,
      timestamp: new Date().toISOString(),
    });
    throw new DeckServiceError("Failed to fetch deck due to an unexpected error");
  }
}

/**
 * Creates a new deck for the authenticated user
 * For testing purposes, uses DEFAULT_USER_ID until authentication is implemented
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param command - Deck creation data (name)
 * @returns The created deck with auto-generated fields and card_count (0 for new decks)
 * @throws DeckServiceError if database insertion fails
 *
 * Used in: POST /api/decks
 *
 * @example
 * const deck = await createDeck(supabase, { name: "History 101" });
 * // Returns: { id: "...", name: "History 101", user_id: "...", card_count: 0, ... }
 */
export async function createDeck(supabase: SupabaseClient<Database>, command: CreateDeckCommand): Promise<DeckDTO> {
  try {
    const { data, error } = await supabase
      .from("decks")
      .insert({
        name: command.name,
        user_id: DEFAULT_USER_ID,
      })
      .select()
      .single();

    if (error) {
      console.error("[DeckService] Database error during createDeck:", {
        error: error.message,
        code: error.code,
        details: error.details,
        command,
        timestamp: new Date().toISOString(),
      });
      throw new DeckServiceError("Failed to create deck");
    }

    if (!data) {
      console.error("[DeckService] No data returned from createDeck:", {
        command,
        timestamp: new Date().toISOString(),
      });
      throw new DeckServiceError("Failed to create deck: No data returned");
    }

    // New deck has no cards yet
    return {
      ...data,
      card_count: 0,
    };
  } catch (error) {
    // Re-throw known error types
    if (error instanceof DeckServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("[DeckService] Unexpected error in createDeck:", {
      error: error instanceof Error ? error.message : "Unknown error",
      command,
      timestamp: new Date().toISOString(),
    });
    throw new DeckServiceError("Failed to create deck due to an unexpected error");
  }
}

/**
 * Updates an existing deck's name
 * RLS policies ensure users can only update their own decks
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param id - UUID of the deck to update
 * @param command - Update data (name)
 * @returns The updated deck with card_count
 * @throws DeckServiceError if deck not found, access denied, or database update fails
 *
 * Used in: PATCH /api/decks/[id]
 *
 * @example
 * const deck = await updateDeck(supabase, "deck-uuid", { name: "Advanced History" });
 * // Returns: { id: "deck-uuid", name: "Advanced History", card_count: 25, ... }
 */
export async function updateDeck(
  supabase: SupabaseClient<Database>,
  id: string,
  command: UpdateDeckCommand
): Promise<DeckDTO> {
  try {
    // Update the deck and fetch it with card count
    const { data, error } = await supabase
      .from("decks")
      .update({
        name: command.name,
      })
      .eq("id", id)
      .select("*, flashcards(count)")
      .single();

    if (error) {
      console.error("[DeckService] Database error during updateDeck:", {
        error: error.message,
        code: error.code,
        details: error.details,
        deckId: id,
        command,
        timestamp: new Date().toISOString(),
      });
      throw new DeckServiceError("Failed to update deck");
    }

    if (!data) {
      console.error("[DeckService] No data returned from updateDeck:", {
        deckId: id,
        command,
        timestamp: new Date().toISOString(),
      });
      throw new DeckServiceError("Deck not found or access denied");
    }

    // Transform the response to include card_count as a number
    const { flashcards, ...deckData } = data;
    return {
      ...deckData,
      card_count: flashcards?.[0]?.count ?? 0,
    };
  } catch (error) {
    // Re-throw known error types
    if (error instanceof DeckServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("[DeckService] Unexpected error in updateDeck:", {
      error: error instanceof Error ? error.message : "Unknown error",
      deckId: id,
      command,
      timestamp: new Date().toISOString(),
    });
    throw new DeckServiceError("Failed to update deck due to an unexpected error");
  }
}

/**
 * Deletes a deck and all associated flashcards (CASCADE)
 * RLS policies ensure users can only delete their own decks
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param id - UUID of the deck to delete
 * @returns void on success
 * @throws DeckServiceError if deck not found, access denied, or database deletion fails
 *
 * Used in: DELETE /api/decks/[id]
 *
 * @example
 * await deleteDeck(supabase, "deck-uuid");
 * // Deck and all associated flashcards are deleted
 */
export async function deleteDeck(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  try {
    const { error, count } = await supabase.from("decks").delete({ count: "exact" }).eq("id", id);

    if (error) {
      console.error("[DeckService] Database error during deleteDeck:", {
        error: error.message,
        code: error.code,
        details: error.details,
        deckId: id,
        timestamp: new Date().toISOString(),
      });
      throw new DeckServiceError("Failed to delete deck");
    }

    // Check if any rows were affected
    if (count === 0) {
      console.error("[DeckService] No deck deleted (not found or access denied):", {
        deckId: id,
        timestamp: new Date().toISOString(),
      });
      throw new DeckServiceError("Deck not found or access denied");
    }
  } catch (error) {
    // Re-throw known error types
    if (error instanceof DeckServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("[DeckService] Unexpected error in deleteDeck:", {
      error: error instanceof Error ? error.message : "Unknown error",
      deckId: id,
      timestamp: new Date().toISOString(),
    });
    throw new DeckServiceError("Failed to delete deck due to an unexpected error");
  }
}
