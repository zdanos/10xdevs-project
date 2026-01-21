import { vi } from "vitest";
import type { GeneratedFlashcardDTO } from "@/types";

/**
 * Mock parsed flashcards response data
 */
export const mockFlashcardsData: GeneratedFlashcardDTO[] = [
  {
    front: "What is TypeScript?",
    back: "TypeScript is a strongly typed programming language that builds on JavaScript.",
  },
  {
    front: "What is React?",
    back: "React is a JavaScript library for building user interfaces.",
  },
  {
    front: "What is Vitest?",
    back: "Vitest is a fast unit test framework for Vite projects.",
  },
];

/**
 * Mock response from OpenAI Responses API (responses.parse)
 * Matches the structure returned by the actual Responses API
 */
export const mockResponsesParseResponse = {
  id: "resp-test-123",
  object: "response",
  created: Date.now(),
  model: "gpt-4o-mini",
  output_parsed: {
    flashcards: mockFlashcardsData,
  },
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
};

/**
 * Mock OpenAI client for testing
 * Uses the newer Responses API (responses.parse) instead of Chat Completions
 */
export const mockOpenAIClient = {
  responses: {
    parse: vi.fn().mockResolvedValue(mockResponsesParseResponse),
  },
};

/**
 * Factory function to create a fresh mock OpenAI client
 * Use this in tests to get a clean mock instance
 *
 * @example
 * ```typescript
 * vi.mock('openai', () => ({
 *   default: vi.fn(() => createMockOpenAIClient()),
 * }));
 * ```
 */
export const createMockOpenAIClient = () => {
  return {
    responses: {
      parse: vi.fn().mockResolvedValue(mockResponsesParseResponse),
    },
  };
};
