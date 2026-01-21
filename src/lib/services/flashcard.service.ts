import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type {
  FlashcardDTO,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  ListFlashcardsResponseDTO,
} from "../../types";

/**
 * Custom error class for flashcard service errors
 */
export class FlashcardServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlashcardServiceError";
  }
}

/**
 * Retrieves all flashcards for a specific deck
 * Flashcards are ordered by creation date (oldest first)
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param deckId - UUID of the deck to fetch flashcards from
 * @returns Array of flashcards in the deck
 * @throws FlashcardServiceError if database query fails
 *
 * Used in: GET /api/flashcards?deck_id=xxx
 *
 * @example
 * const flashcards = await listDeckFlashcards(supabase, "deck-uuid");
 * // Returns: [{ id: "...", front: "Question", back: "Answer", ... }, ...]
 */
export async function listDeckFlashcards(
  supabase: SupabaseClient<Database>,
  deckId: string
): Promise<ListFlashcardsResponseDTO> {
  try {
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[FlashcardService] Database error during listDeckFlashcards:", {
        error: error.message,
        code: error.code,
        details: error.details,
        deckId,
        timestamp: new Date().toISOString(),
      });
      throw new FlashcardServiceError("Failed to fetch flashcards");
    }

    return data;
  } catch (error) {
    // Re-throw known error types
    if (error instanceof FlashcardServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("[FlashcardService] Unexpected error in listDeckFlashcards:", {
      error: error instanceof Error ? error.message : "Unknown error",
      deckId,
      timestamp: new Date().toISOString(),
    });
    throw new FlashcardServiceError("Failed to fetch flashcards due to an unexpected error");
  }
}

/**
 * Creates one or multiple flashcards in a deck
 * Supports both single flashcard creation and bulk insert (up to 50 cards)
 * The user_id is automatically extracted from the authenticated Supabase client
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param commands - Single flashcard or array of flashcards to create
 * @returns Created flashcard(s) - single object if input was single, array if bulk
 * @throws FlashcardServiceError if database insertion fails, deck not found, or user not authenticated
 *
 * Used in: POST /api/flashcards
 *
 * @example
 * // Single flashcard
 * const flashcard = await createFlashcards(supabase, {
 *   deck_id: "deck-uuid",
 *   front: "Question",
 *   back: "Answer",
 *   creation_source: "Manual"
 * });
 *
 * @example
 * // Bulk insert
 * const flashcards = await createFlashcards(supabase, [
 *   { deck_id: "deck-uuid", front: "Q1", back: "A1", creation_source: "AI" },
 *   { deck_id: "deck-uuid", front: "Q2", back: "A2", creation_source: "AI" }
 * ]);
 */
export async function createFlashcards(
  supabase: SupabaseClient<Database>,
  commands: CreateFlashcardCommand | CreateFlashcardCommand[]
): Promise<FlashcardDTO | FlashcardDTO[]> {
  const isSingle = !Array.isArray(commands);
  const commandsArray = Array.isArray(commands) ? commands : [commands];

  try {
    // Get authenticated user from Supabase client
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[FlashcardService] User not authenticated:", {
        authError: authError?.message,
        timestamp: new Date().toISOString(),
      });
      throw new FlashcardServiceError("User not authenticated");
    }

    // Add user_id to each command
    const commandsWithUserId = commandsArray.map((cmd) => ({
      ...cmd,
      user_id: user.id,
    }));

    const { data, error } = await supabase.from("flashcards").insert(commandsWithUserId).select();

    if (error) {
      console.error("[FlashcardService] Database error during createFlashcards:", {
        error: error.message,
        code: error.code,
        details: error.details,
        commands: commandsArray,
        timestamp: new Date().toISOString(),
      });

      // Map FK constraint error to user-friendly message
      if (error.code === "23503") {
        throw new FlashcardServiceError("Deck not found or access denied");
      }

      throw new FlashcardServiceError("Failed to create flashcard(s)");
    }

    if (!data || data.length === 0) {
      console.error("[FlashcardService] No data returned from createFlashcards:", {
        commands: commandsArray,
        timestamp: new Date().toISOString(),
      });
      throw new FlashcardServiceError("Failed to create flashcard(s): No data returned");
    }

    // Return format matching input (single vs array)
    return isSingle ? data[0] : data;
  } catch (error) {
    if (error instanceof FlashcardServiceError) {
      throw error;
    }

    console.error("[FlashcardService] Unexpected error in createFlashcards:", {
      error: error instanceof Error ? error.message : "Unknown error",
      commands: commandsArray,
      timestamp: new Date().toISOString(),
    });
    throw new FlashcardServiceError("Failed to create flashcard(s) due to an unexpected error");
  }
}

/**
 * Updates a flashcard's content (front and/or back text)
 * RLS policies ensure users can only update their own flashcards
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param id - UUID of the flashcard to update
 * @param command - Update data (front and/or back)
 * @returns The updated flashcard
 * @throws FlashcardServiceError if flashcard not found, access denied, or database update fails
 *
 * Used in: PATCH /api/flashcards/[id]
 *
 * @example
 * const flashcard = await updateFlashcard(supabase, "flashcard-uuid", {
 *   front: "Updated Question"
 * });
 * // Returns: { id: "flashcard-uuid", front: "Updated Question", ... }
 */
export async function updateFlashcard(
  supabase: SupabaseClient<Database>,
  id: string,
  command: UpdateFlashcardCommand
): Promise<FlashcardDTO> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<UpdateFlashcardCommand> = {};
    if (command.front !== undefined) {
      updateData.front = command.front;
    }
    if (command.back !== undefined) {
      updateData.back = command.back;
    }

    const { data, error } = await supabase.from("flashcards").update(updateData).eq("id", id).select().single();

    if (error) {
      console.error("[FlashcardService] Database error during updateFlashcard:", {
        error: error.message,
        code: error.code,
        details: error.details,
        flashcardId: id,
        command,
        timestamp: new Date().toISOString(),
      });
      throw new FlashcardServiceError("Failed to update flashcard");
    }

    if (!data) {
      console.error("[FlashcardService] No data returned from updateFlashcard:", {
        flashcardId: id,
        command,
        timestamp: new Date().toISOString(),
      });
      throw new FlashcardServiceError("Flashcard not found or access denied");
    }

    return data;
  } catch (error) {
    // Re-throw known error types
    if (error instanceof FlashcardServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("[FlashcardService] Unexpected error in updateFlashcard:", {
      error: error instanceof Error ? error.message : "Unknown error",
      flashcardId: id,
      command,
      timestamp: new Date().toISOString(),
    });
    throw new FlashcardServiceError("Failed to update flashcard due to an unexpected error");
  }
}

/**
 * Deletes a flashcard
 * RLS policies ensure users can only delete their own flashcards
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param id - UUID of the flashcard to delete
 * @returns void on success
 * @throws FlashcardServiceError if flashcard not found, access denied, or database deletion fails
 *
 * Used in: DELETE /api/flashcards/[id]
 *
 * @example
 * await deleteFlashcard(supabase, "flashcard-uuid");
 * // Flashcard is deleted
 */
export async function deleteFlashcard(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  try {
    const { error, count } = await supabase.from("flashcards").delete({ count: "exact" }).eq("id", id);

    if (error) {
      console.error("[FlashcardService] Database error during deleteFlashcard:", {
        error: error.message,
        code: error.code,
        details: error.details,
        flashcardId: id,
        timestamp: new Date().toISOString(),
      });
      throw new FlashcardServiceError("Failed to delete flashcard");
    }

    // Check if any rows were affected
    if (count === 0) {
      console.error("[FlashcardService] No flashcard deleted (not found or access denied):", {
        flashcardId: id,
        timestamp: new Date().toISOString(),
      });
      throw new FlashcardServiceError("Flashcard not found or access denied");
    }
  } catch (error) {
    // Re-throw known error types
    if (error instanceof FlashcardServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("[FlashcardService] Unexpected error in deleteFlashcard:", {
      error: error instanceof Error ? error.message : "Unknown error",
      flashcardId: id,
      timestamp: new Date().toISOString(),
    });
    throw new FlashcardServiceError("Failed to delete flashcard due to an unexpected error");
  }
}
