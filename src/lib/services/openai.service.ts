import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { LengthFinishReasonError, ContentFilterFinishReasonError } from "openai/error";
import type { GeneratedFlashcardDTO } from "@/types";
import { FlashcardsResponseSchema } from "@/lib/validators/generate-flashcards.validator";

/**
 * Custom error class for OpenAI service errors
 */
export class OpenAIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIServiceError";
  }
}

/**
 * Initialize OpenAI client instance
 */
const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

/**
 * Generate flashcards from user-provided text using OpenAI's GPT-4o-mini model
 *
 * This function uses the OpenAI Responses API with structured outputs (zodTextFormat)
 * to ensure the response adheres to our Zod schema (200/500 character limits).
 *
 * The Responses API provides several advantages over Chat Completions:
 * - Automatic schema validation with guaranteed adherence
 * - Direct access to parsed objects via output_parsed (no manual JSON parsing)
 * - Built-in error handling for truncation and content filtering
 * - Simpler API with single input parameter instead of messages array
 *
 * @param text - User-provided notes or content to convert into flashcards
 * @returns Promise<GeneratedFlashcardDTO[]> - Array of generated flashcard proposals
 * @throws OpenAIServiceError - For OpenAI API errors, parsing errors, or service unavailability
 *
 * @example
 * const flashcards = await generateFlashcards("The Renaissance was a period...");
 * // Returns: [{ front: "What was the Renaissance?", back: "A period..." }, ...]
 */
export async function generateFlashcards(text: string): Promise<GeneratedFlashcardDTO[]> {
  try {
    // Sanitize user input (trim whitespace, basic validation)
    const sanitizedText = text.trim();

    if (!sanitizedText) {
      throw new OpenAIServiceError("Text cannot be empty after sanitization");
    }

    // Call OpenAI Responses API with structured output
    // Uses single 'input' parameter combining instructions and user content
    const response = await openai.responses.parse({
      model: "gpt-4o-mini",
      input: `Generate educational flashcards from the following text. Create clear, specific questions that test key concepts and provide concise but complete answers.

Text to process:
${sanitizedText}

Requirements:
- Generate 3-8 flashcards depending on content length
- Questions should be specific and testable (avoid yes/no questions)
- Answers should be concise but complete
- Use proper grammar and punctuation
- Focus on the most important concepts
- Front text must be max 200 characters
- Back text must be max 500 characters
- Use the same language as used in the text`,
      text: {
        format: zodTextFormat(FlashcardsResponseSchema, "flashcards_response"),
      },
      temperature: 0.7,
    });

    // Access type-safe parsed output directly (no manual JSON parsing needed)
    if (response.output_parsed) {
      return response.output_parsed.flashcards;
    }

    throw new OpenAIServiceError("No parsed output received from OpenAI");
  } catch (error) {
    // Handle specific Responses API errors
    if (error instanceof LengthFinishReasonError) {
      console.error("OpenAI response truncated due to length");
      throw new OpenAIServiceError("Response truncated: content too long");
    }

    if (error instanceof ContentFilterFinishReasonError) {
      console.error("OpenAI response blocked by content filter");
      throw new OpenAIServiceError("Response blocked by content filter");
    }

    // Handle general OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      console.error("OpenAI API error:", {
        status: error.status,
        message: error.message,
        code: error.code,
      });

      // Handle rate limiting
      if (error.status === 429) {
        throw new OpenAIServiceError(
          "AI generation service is temporarily rate-limited. Please try again in a few moments."
        );
      }

      // Handle service unavailability
      if (error.status && error.status >= 500) {
        throw new OpenAIServiceError("AI generation service is temporarily unavailable. Please try again later.");
      }

      throw new OpenAIServiceError(`OpenAI API error: ${error.message}`);
    }

    // Re-throw OpenAIServiceError instances
    if (error instanceof OpenAIServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("Unexpected error in generateFlashcards:", error);
    throw new OpenAIServiceError("Failed to generate flashcards due to an unexpected error");
  }
}
