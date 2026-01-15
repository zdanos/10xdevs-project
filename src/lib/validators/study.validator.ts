import { z } from "zod";

/**
 * Validator for Fetch Study Queue query parameters
 * Used in: GET /api/study/queue
 *
 * Query parameters:
 * - deck_id (optional): UUID of the deck to filter flashcards
 * - limit (optional): Number of flashcards to return (default 20, max 100)
 */
export const fetchStudyQueueSchema = z.object({
  deck_id: z.string().uuid("Invalid deck ID format").optional(),
  limit: z.coerce.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(20),
});

/**
 * Validator for Process Review request body
 * Used in: POST /api/study/review
 *
 * Request body:
 * - card_id (required): UUID of the flashcard being reviewed
 * - rating (required): User's recall quality rating ("again", "hard", "good", "easy")
 */
export const processReviewSchema = z.object({
  card_id: z.string().uuid({
    message: "Invalid UUID format for card_id",
  }),
  rating: z.enum(["again", "hard", "good", "easy"], {
    errorMap: () => ({ message: "Must be one of: again, hard, good, easy" }),
  }),
});

// Export validated types
export type FetchStudyQueueInput = z.infer<typeof fetchStudyQueueSchema>;
export type ProcessReviewInput = z.infer<typeof processReviewSchema>;
