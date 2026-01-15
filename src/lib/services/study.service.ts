import { supermemo } from "supermemo";
import type { SuperMemoItem, SuperMemoGrade } from "supermemo";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type {
  FlashcardDTO,
  FetchStudyQueueCommand,
  ProcessReviewCommandV2,
  ProcessReviewResponseDTO,
} from "../../types";
import { SM2_GRADE_MAP } from "../../types";
import type { SM2Rating } from "../../types";

/**
 * Custom error class for study service errors
 */
export class StudyServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudyServiceError";
  }
}

/**
 * Type-safe mapping from SM2Rating to SuperMemoGrade
 * Uses the SM2_GRADE_MAP from types.ts
 */
const GRADE_MAP: Record<SM2Rating, SuperMemoGrade> = SM2_GRADE_MAP;

/**
 * Fetch flashcards due for review
 *
 * Retrieves flashcards that are due for review based on their next_review_date.
 * Results are ordered by next_review_date (oldest first) to prioritize overdue cards.
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param params - Query parameters (optional deck_id filter and limit)
 * @returns Array of flashcards due for review
 * @throws StudyServiceError if database query fails
 *
 * Used in: GET /api/study/queue
 *
 * @example
 * // Fetch all due flashcards (default limit 20)
 * const queue = await fetchStudyQueue(supabase, {});
 *
 * @example
 * // Fetch due flashcards for specific deck
 * const queue = await fetchStudyQueue(supabase, {
 *   deck_id: "550e8400-e29b-41d4-a716-446655440000",
 *   limit: 10
 * });
 */
export async function fetchStudyQueue(
  supabase: SupabaseClient<Database>,
  params: FetchStudyQueueCommand
): Promise<FlashcardDTO[]> {
  const { deck_id, limit = 20 } = params;

  try {
    // Build query for flashcards due for review
    // next_review_date <= NOW() ensures we only get cards that are due
    let query = supabase
      .from("flashcards")
      .select("*")
      .lte("next_review_date", new Date().toISOString())
      .order("next_review_date", { ascending: true })
      .limit(limit);

    // Optional filtering by deck
    if (deck_id) {
      query = query.eq("deck_id", deck_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[StudyService] Database error during fetchStudyQueue:", {
        error: error.message,
        code: error.code,
        details: error.details,
        deck_id,
        limit,
        timestamp: new Date().toISOString(),
      });
      throw new StudyServiceError("Failed to fetch study queue");
    }

    // Return empty array if no flashcards are due (not an error)
    return data || [];
  } catch (error) {
    // Re-throw known error types
    if (error instanceof StudyServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("[StudyService] Unexpected error in fetchStudyQueue:", {
      error: error instanceof Error ? error.message : "Unknown error",
      deck_id,
      limit,
      timestamp: new Date().toISOString(),
    });
    throw new StudyServiceError("Failed to fetch study queue due to an unexpected error");
  }
}

/**
 * Process a flashcard review using SM-2 algorithm
 *
 * This function implements the SuperMemo 2 spaced repetition algorithm:
 * 1. Fetches the current flashcard and its SM-2 state
 * 2. Converts the user's rating to an SM-2 grade
 * 3. Calculates new SM-2 parameters (interval, repetition, easiness factor)
 * 4. Computes the next review date
 * 5. Updates the flashcard in the database
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @param command - Review data (card_id and rating)
 * @returns Updated flashcard with new SM-2 state
 * @throws StudyServiceError if flashcard not found or database operations fail
 *
 * Used in: POST /api/study/review
 *
 * @example
 * const result = await processReview(supabase, {
 *   card_id: "123e4567-e89b-12d3-a456-426614174000",
 *   rating: "good"
 * });
 * // Returns: { id, repetition_number, easiness_factor, interval, next_review_date }
 */
export async function processReview(
  supabase: SupabaseClient<Database>,
  command: ProcessReviewCommandV2
): Promise<ProcessReviewResponseDTO> {
  const { card_id, rating } = command;

  try {
    // 1. Fetch current flashcard
    const { data: flashcard, error: fetchError } = await supabase
      .from("flashcards")
      .select("*")
      .eq("id", card_id)
      .single();

    if (fetchError || !flashcard) {
      console.error("[StudyService] Error fetching flashcard:", {
        error: fetchError?.message,
        code: fetchError?.code,
        card_id,
        timestamp: new Date().toISOString(),
      });
      throw new StudyServiceError("Flashcard not found");
    }

    // 2. Extract current SM-2 state from flashcard
    const currentState: SuperMemoItem = {
      interval: flashcard.interval,
      repetition: flashcard.repetition_number,
      efactor: flashcard.easiness_factor,
    };

    // 3. Map rating to SM-2 grade
    const grade = GRADE_MAP[rating];

    // 4. Calculate new SM-2 state using supermemo library
    let result: SuperMemoItem;

    try {
      result = supermemo(currentState, grade);
    } catch (error) {
      console.error("[StudyService] Error calculating SM-2:", {
        error: error instanceof Error ? error.message : "Unknown error",
        currentState,
        grade,
        card_id,
        rating,
        timestamp: new Date().toISOString(),
      });
      throw new StudyServiceError("Failed to calculate review schedule");
    }

    // 5. Calculate next review date
    // Add the interval (in days) to the current date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + result.interval);

    // 6. Update flashcard in database with new SM-2 state
    const { data: updatedCard, error: updateError } = await supabase
      .from("flashcards")
      .update({
        repetition_number: result.repetition,
        easiness_factor: result.efactor,
        interval: result.interval,
        next_review_date: nextReviewDate.toISOString(),
      })
      .eq("id", card_id)
      .select("id, repetition_number, easiness_factor, interval, next_review_date")
      .single();

    if (updateError || !updatedCard) {
      console.error("[StudyService] Error updating flashcard:", {
        error: updateError?.message,
        code: updateError?.code,
        card_id,
        newState: result,
        timestamp: new Date().toISOString(),
      });
      throw new StudyServiceError("Failed to update flashcard");
    }

    return updatedCard as ProcessReviewResponseDTO;
  } catch (error) {
    // Re-throw known error types
    if (error instanceof StudyServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("[StudyService] Unexpected error in processReview:", {
      error: error instanceof Error ? error.message : "Unknown error",
      card_id,
      rating,
      timestamp: new Date().toISOString(),
    });
    throw new StudyServiceError("Failed to process review due to an unexpected error");
  }
}
