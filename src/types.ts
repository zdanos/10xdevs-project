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
 * Contains all fields from the deck entity plus computed fields
 * for client-side display and management operations.
 */
export type DeckDTO = DeckEntity & {
  card_count: number; // Number of flashcards in this deck
};

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
 * Contains the generated flashcard proposals, generation ID for metrics tracking,
 * and remaining quota information.
 */
export interface GenerateFlashcardsResponseDTO {
  flashcards: GeneratedFlashcardDTO[];
  generation_id: string;
  quota_remaining: number;
}

/**
 * ListDecksResponseDTO - Response from list decks endpoint
 * Used in: GET /api/decks
 *
 * Returns an array of all user's decks ordered by creation date descending
 */
export type ListDecksResponseDTO = DeckDTO[];

/**
 * ListFlashcardsResponseDTO - Response from list flashcards endpoint
 * Used in: GET /api/flashcards
 *
 * Returns an array of all flashcards in a specific deck ordered by creation date ascending
 */
export type ListFlashcardsResponseDTO = FlashcardDTO[];

/**
 * BulkCreateFlashcardsCommand - Command model for bulk flashcard creation
 * Used in: POST /api/flashcards (array payload)
 *
 * Validates array length (1-50 items) to prevent abuse
 */
export type BulkCreateFlashcardsCommand = CreateFlashcardCommand[];

/**
 * FetchStudyQueueResponseDTO - Array of flashcards due for review
 * Used in: GET /api/study/queue
 *
 * Returns flashcards that are due for review based on SM-2 scheduling,
 * ordered by next_review_date ascending.
 */
export type FetchStudyQueueResponseDTO = FlashcardDTO[];

/**
 * ProcessReviewResponseDTO - Updated flashcard with new SM-2 state
 * Used in: POST /api/study/review
 *
 * Returns only the fields relevant to the study UI:
 * - id: To identify the flashcard
 * - SM-2 state fields: For algorithm tracking and debugging
 * - next_review_date: To determine when card should appear again
 */
export interface ProcessReviewResponseDTO {
  id: string;
  repetition_number: number;
  easiness_factor: number;
  interval: number;
  next_review_date: string; // ISO 8601 timestamp
}

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
 *
 * Optional fields:
 * - generation_id: Links flashcard to its AI generation session for metrics tracking
 */
export type CreateFlashcardCommand = Pick<
  TablesInsert<"flashcards">,
  "deck_id" | "front" | "back" | "creation_source" | "generation_id"
>;

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

/**
 * FetchStudyQueueCommand - Query parameters for fetching study queue
 * Used in: GET /api/study/queue
 *
 * Optional filters to customize the study queue:
 * - deck_id: Filter flashcards to a specific deck
 * - limit: Maximum number of flashcards to return (default 20, max 100)
 */
export interface FetchStudyQueueCommand {
  deck_id?: string; // Optional UUID
  limit?: number; // Optional, default 20, max 100
}

/**
 * ProcessReviewCommandV2 - Request payload for study/review endpoint
 * Used in: POST /api/study/review
 *
 * Uses string literal ratings instead of numeric enum for better API ergonomics.
 * The ratings map to SM-2 grades as follows:
 * - "again" → 1 (Complete blackout, wrong answer)
 * - "hard" → 3 (Correct but with significant difficulty)
 * - "good" → 4 (Correct with some hesitation)
 * - "easy" → 5 (Perfect, instant recall)
 */
export interface ProcessReviewCommandV2 {
  card_id: string;
  rating: "again" | "hard" | "good" | "easy";
}

// ============================================================================
// Internal Service Types - Used for SM-2 algorithm implementation
// ============================================================================

/**
 * SM2_GRADE_MAP - Mapping from UI-friendly rating strings to SM-2 grades
 * Used internally by the study service to convert user ratings to numeric grades
 */
export const SM2_GRADE_MAP = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
} as const;

/**
 * SM2Rating - Type alias for the rating keys in SM2_GRADE_MAP
 */
export type SM2Rating = keyof typeof SM2_GRADE_MAP;

// ============================================================================
// ViewModels - Used for Generator View (AI Creation Flow)
// ============================================================================

/**
 * CardStatus - Status of a flashcard in the staging area
 * - pending: Initial state after generation
 * - accepted: User clicked accept (green state)
 * - edited: User modified front/back (blue state, also implies accepted)
 * - rejected: User clicked reject (will be filtered out)
 */
export type CardStatus = "pending" | "accepted" | "rejected" | "edited";

/**
 * StagingFlashcard - Client-side representation of a flashcard in staging
 * Used in: Generator view staging area
 *
 * Represents ephemeral flashcard data before final save to deck.
 * Generated on the client with temporary UUID for tracking during edit/accept/reject flow.
 */
export interface StagingFlashcard {
  id: string; // Temporary UUID (client-generated)
  front: string; // Question text
  back: string; // Answer text
  status: CardStatus; // Current card state
  isEdited: boolean; // Tracks if user modified content
}

/**
 * GeneratorViewState - Complete state for Generator view
 * Used in: useGeneratorState custom hook
 *
 * Manages the entire three-phase workflow:
 * 1. Input phase: sourceText entry
 * 2. Generation phase: API call with loading/error states
 * 3. Staging phase: Card management with edit/accept/reject
 * 4. Save phase: Deck selection and bulk save
 */
export interface GeneratorViewState {
  // Input phase
  sourceText: string; // User input (0-5000 chars)

  // Quota tracking
  quotaRemaining: number; // 0-10 generations left

  // Generation phase
  isGenerating: boolean; // API call in progress
  generationError: string | null; // Error message from generation
  generationId: string | null; // ID for metrics tracking

  // Staging phase
  stagingCards: StagingFlashcard[]; // Generated/edited cards
  editingCardId: string | null; // ID of card being edited

  // Save phase
  isSaving: boolean; // Save API call in progress
  saveError: string | null; // Error message from save
  showDeckModal: boolean; // Show/hide deck selection
  decks: DeckDTO[]; // Available decks for selection
  isLoadingDecks: boolean; // Loading decks from API
}

/**
 * QuotaInfo - Structured quota data for display
 * Used in: QuotaIndicator component
 *
 * Provides formatted quota information including remaining count
 * and time until reset.
 */
export interface QuotaInfo {
  current: number; // Generations used today (0-10)
  max: number; // Maximum allowed (always 10)
  remaining: number; // Calculated: max - current
  resetsIn: number; // Hours until reset (calculated from last_reset_date)
}

/**
 * ValidationState - UI validation feedback
 * Used in: SourceInput component
 *
 * Provides structured validation feedback for form inputs
 * with appropriate messaging and visual states.
 */
export interface ValidationState {
  isValid: boolean;
  message: string;
  type: "info" | "warning" | "error" | "success";
}

/**
 * ApiError - Standardized error structure from API responses
 * Used in: Error handling across all API calls
 *
 * Consistent error format returned by backend endpoints.
 */
export interface ApiError {
  error: string; // Error type (e.g., "Validation Error")
  message: string; // User-friendly message
  details?: Record<string, string[]>; // Additional error details
  retry_after?: number; // Seconds until retry (for 403)
}

// ============================================================================
// ViewModels - Used for Decks Library View
// ============================================================================

/**
 * DecksLibraryViewState - Complete state for Deck Library view
 * Used in: useDecksLibrary custom hook
 *
 * Manages the entire deck library workflow including:
 * - Deck listing and filtering
 * - Search functionality
 * - Deck creation modal state
 * - Loading and error states
 */
export interface DecksLibraryViewState {
  // Data state
  decks: DeckDTO[];
  filteredDecks: DeckDTO[];

  // Search state
  searchQuery: string;

  // Loading/error states
  isLoading: boolean;
  error: ApiError | null;

  // Modal state
  showCreateModal: boolean;
  isCreating: boolean;
  createError: string | null;
}

/**
 * CreateDeckFormState - State for create deck modal form
 * Used in: CreateDeckModal component
 *
 * Tracks form input, validation, and submission state
 */
export interface CreateDeckFormState {
  name: string;
  validationError: string | null;
  isValid: boolean;
}

/**
 * DeckFilterOptions - Options for filtering decks
 * Used in: Search and filter logic
 */
export interface DeckFilterOptions {
  query: string;
  sortBy: "name" | "created_at" | "card_count";
  sortDirection: "asc" | "desc";
}
