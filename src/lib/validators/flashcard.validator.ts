import { z } from "zod";

/**
 * Schema for validating deck_id query parameter
 * Used in: GET /api/flashcards?deck_id=xxx
 */
export const deckIdQuerySchema = z.string().uuid("Invalid deck ID format");

/**
 * Schema for creating a single flashcard
 * Validates all required fields and enforces length constraints
 *
 * Used in: POST /api/flashcards (single object)
 */
export const createFlashcardSchema = z.object({
  deck_id: z.string().uuid("Invalid deck ID format"),
  front: z.string().trim().min(1, "Front text cannot be empty").max(200, "Front text must be 200 characters or less"),
  back: z.string().trim().min(1, "Back text cannot be empty").max(500, "Back text must be 500 characters or less"),
  creation_source: z.enum(["AI", "EditedAI", "Manual"], {
    errorMap: () => ({ message: "Creation source must be AI, EditedAI, or Manual" }),
  }),
  generation_id: z.string().uuid("Invalid generation ID format").optional(),
});

/**
 * Schema for bulk flashcard creation
 * Validates array of flashcards with size limits (1-50 items)
 *
 * Used in: POST /api/flashcards (array payload)
 */
export const bulkCreateFlashcardsSchema = z
  .array(createFlashcardSchema)
  .min(1, "At least one flashcard must be provided")
  .max(50, "Cannot create more than 50 flashcards at once");

/**
 * Schema for updating a flashcard
 * At least one field (front or back) must be provided
 *
 * Used in: PATCH /api/flashcards/[id]
 */
export const updateFlashcardSchema = z
  .object({
    front: z
      .string()
      .trim()
      .min(1, "Front text cannot be empty")
      .max(200, "Front text must be 200 characters or less")
      .optional(),
    back: z
      .string()
      .trim()
      .min(1, "Back text cannot be empty")
      .max(500, "Back text must be 500 characters or less")
      .optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "At least one field (front or back) must be provided",
  });

/**
 * Schema for validating UUID parameters
 * Used for both update and delete operations
 *
 * Used in: PATCH /api/flashcards/[id], DELETE /api/flashcards/[id]
 */
export const flashcardIdSchema = z.string().uuid("Invalid flashcard ID format");

// Export validated types
export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;
export type BulkCreateFlashcardsInput = z.infer<typeof bulkCreateFlashcardsSchema>;
export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>;
export type FlashcardIdInput = z.infer<typeof flashcardIdSchema>;
export type DeckIdQueryInput = z.infer<typeof deckIdQuerySchema>;
