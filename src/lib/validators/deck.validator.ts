import { z } from "zod";

/**
 * Schema for creating a new deck
 * Validates that name is provided and within acceptable limits
 *
 * Used in: POST /api/decks
 */
export const createDeckSchema = z.object({
  name: z.string().trim().min(1, "Deck name cannot be empty").max(100, "Deck name must be 100 characters or less"),
});

/**
 * Schema for updating a deck
 * Same validation rules as creation
 *
 * Used in: PATCH /api/decks/[id]
 */
export const updateDeckSchema = z.object({
  name: z.string().trim().min(1, "Deck name cannot be empty").max(100, "Deck name must be 100 characters or less"),
});

/**
 * Schema for validating UUID parameters
 * Used for both update and delete operations
 *
 * Used in: PATCH /api/decks/[id], DELETE /api/decks/[id]
 */
export const deckIdSchema = z.string().uuid("Invalid deck ID format");

// Export validated types
export type CreateDeckInput = z.infer<typeof createDeckSchema>;
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;
export type DeckIdInput = z.infer<typeof deckIdSchema>;
