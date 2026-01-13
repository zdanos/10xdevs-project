import { z } from "zod";

/**
 * Request validation schema for generate-flashcards endpoint
 * Enforces text length constraints (1-5000 characters)
 */
export const GenerateFlashcardsRequestSchema = z.object({
  text: z.string().min(1, "Text cannot be empty").max(5000, "Text exceeds maximum length of 5000 characters").trim(),
});

/**
 * Schema for individual flashcard (enforces database constraints)
 * Front: max 200 characters (question)
 * Back: max 500 characters (answer)
 */
export const GeneratedFlashcardSchema = z.object({
  front: z.string().max(200, "Question exceeds 200 characters"),
  back: z.string().max(500, "Answer exceeds 500 characters"),
});

/**
 * Schema for complete OpenAI response structure
 * This schema is used with zodTextFormat() in the OpenAI service
 * to enforce structured output validation
 */
export const FlashcardsResponseSchema = z.object({
  flashcards: z.array(GeneratedFlashcardSchema),
});

/**
 * Type helpers for type-safe usage
 */
export type ValidatedGenerateRequest = z.infer<typeof GenerateFlashcardsRequestSchema>;
export type ValidatedFlashcardsResponse = z.infer<typeof FlashcardsResponseSchema>;
