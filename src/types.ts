/**
 * DTO (Data Transfer Object) and Command Model Types
 *
 * This file contains type definitions for data transfer objects and command models
 * used in the API layer. All types are derived from the database entities defined
 * in src/db/database.types.ts to ensure type safety and consistency across the application.
 */

import type { Tables, TablesInsert, Enums, TablesUpdate } from "./db/database.types";

// ============================================================================
// Entity Type Aliases (for convenience and readability)
// ============================================================================

/**
 * Profile entity - represents a user's profile with metadata and usage statistics
 */
export type ProfileEntity = Tables<"profiles">;

/**
 * Deck entity - represents a collection of flashcards
 */
export type DeckEntity = Tables<"decks">;

/**
 * Flashcard entity - represents a single flashcard with content and SM-2 algorithm data
 */
export type FlashcardEntity = Tables<"flashcards">;

/**
 * Generation Log entity - represents a record of AI flashcard generation
 */
export type GenerationLogEntity = Tables<"generation_logs">;

/**
 * Card source type enum - indicates how a flashcard was created
 */
export type CardSourceType = Enums<"card_source_type">;

/**
 * Review rating enum - SM-2 algorithm rating scale
 * Used to evaluate flashcard recall difficulty during study sessions
 */
export enum ReviewRating {
  /** Complete blackout - no recall */
  Again = 1,
  /** Incorrect response; correct answer seemed easy to recall */
  Hard = 2,
  /** Correct response; correct answer recalled with some difficulty */
  Good = 3,
  /** Correct response; perfect recall */
  Easy = 4,
}

// ============================================================================
// DTOs (Data Transfer Objects) - Used for API responses
// ============================================================================

/**
 * ProfileDTO - User profile data with quota information
 * Used in: GET /rest/v1/profiles (Section 2.5 of API plan)
 *
 * Exposes only the fields needed for client-side quota management
 * and usage statistics display.
 */
export type ProfileDTO = Pick<ProfileEntity, "generations_count" | "last_generation_date" | "last_reset_date">;

/**
 * DeckDTO - Deck information for listing and management
 * Used in: GET /rest/v1/decks (Section 2.2 of API plan)
 *
 * Contains all fields from the deck entity as they are all relevant
 * for client-side display and management operations.
 */
export type DeckDTO = DeckEntity;

/**
 * FlashcardDTO - Complete flashcard data for management and study views
 * Used in:
 * - GET /rest/v1/flashcards (Section 2.3 of API plan - Management)
 * - GET /rest/v1/flashcards (Section 2.4 of API plan - Study Queue)
 *
 * Contains all fields from the flashcard entity to support both
 * management operations and the study interface.
 */
export type FlashcardDTO = FlashcardEntity;

/**
 * GeneratedFlashcardDTO - AI-generated flashcard proposal (not yet saved to DB)
 * Used in: POST /functions/v1/generate-flashcards response (Section 2.1 of API plan)
 *
 * Represents ephemeral flashcard data returned from OpenAI before user verification.
 * Only includes the content fields, as this data hasn't been persisted to the database yet.
 */
export interface GeneratedFlashcardDTO {
  front: string;
  back: string;
}

/**
 * GenerateFlashcardsResponseDTO - Response from AI generation endpoint
 * Used in: POST /functions/v1/generate-flashcards (Section 2.1 of API plan)
 *
 * Contains the generated flashcard proposals and remaining quota information.
 */
export interface GenerateFlashcardsResponseDTO {
  flashcards: GeneratedFlashcardDTO[];
  quota_remaining: number;
}

/**
 * ListDecksResponseDTO - Response from list decks endpoint
 * Used in: GET /api/decks
 *
 * Returns an array of all user's decks ordered by creation date descending
 */
export type ListDecksResponseDTO = DeckDTO[];

// ============================================================================
// Command Models - Used for API requests (write operations)
// ============================================================================

/**
 * GenerateFlashcardsCommand - Request payload for AI flashcard generation
 * Used in: POST /functions/v1/generate-flashcards (Section 2.1 of API plan)
 *
 * Validation: text must be max 5000 characters (enforced in Edge Function)
 */
export interface GenerateFlashcardsCommand {
  text: string;
}

/**
 * CreateDeckCommand - Request payload for creating a new deck
 * Used in: POST /rest/v1/decks (Section 2.2 of API plan)
 *
 * Derives from the Insert type but only exposes the user-provided field (name).
 * Other fields (id, user_id, timestamps) are set automatically by the database.
 */
export type CreateDeckCommand = Pick<TablesInsert<"decks">, "name">;

/**
 * UpdateDeckCommand - Request payload for updating a deck's name
 * Used in: PATCH /rest/v1/decks (Section 2.2 of API plan)
 *
 * Derives from the Update type but only exposes the user-provided field (name).
 */
export type UpdateDeckCommand = Pick<TablesUpdate<"decks">, "name">;

/**
 * CreateFlashcardCommand - Request payload for saving flashcards (bulk or single)
 * Used in: POST /rest/v1/flashcards (Section 2.3 of API plan)
 *
 * Supports saving AI-generated cards (after user verification) or manually created cards.
 * SM-2 algorithm fields (easiness_factor, interval, etc.) use database defaults for new cards.
 *
 * Required fields:
 * - deck_id: Target deck for the flashcard
 * - front: Question text (max 200 chars, validated by DB)
 * - back: Answer text (max 500 chars, validated by DB)
 * - creation_source: Must be 'AI', 'EditedAI', or 'Manual'
 */
export type CreateFlashcardCommand = Pick<TablesInsert<"flashcards">, "deck_id" | "front" | "back" | "creation_source">;

/**
 * UpdateFlashcardCommand - Request payload for updating flashcard content
 * Used in: PATCH /rest/v1/flashcards (Section 2.3 of API plan)
 *
 * Allows updating the content of a flashcard (e.g., fixing typos).
 * At least one field must be provided. The ID is provided via URL parameter.
 */
export interface UpdateFlashcardCommand {
  front?: string;
  back?: string;
}

/**
 * ProcessReviewCommand - Request payload for processing a flashcard review
 * Used in: POST /rest/v1/rpc/process_review (Section 2.4 of API plan)
 *
 * Submits a user's rating for a flashcard to calculate the next review interval
 * using the SM-2 spaced repetition algorithm.
 *
 * @see ReviewRating for the rating scale values
 */
export interface ProcessReviewCommand {
  card_id: string;
  rating: ReviewRating;
}
