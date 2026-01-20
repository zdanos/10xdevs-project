import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockResponsesParseResponse, mockFlashcardsData } from "@/test/mocks/openai.mock";

// Create mock responses.parse function before importing the service
const mockResponsesParse = vi.fn().mockResolvedValue(mockResponsesParseResponse);

// Mock the OpenAI module before importing the service
vi.mock("openai", () => {
  // Define error classes inside the factory
  class MockAPIError extends Error {
    status: number | undefined;
    code: string | null | undefined;
    error: Record<string, unknown>;
    headers: Headers | undefined;
    constructor(
      status: number | undefined,
      error: Record<string, unknown>,
      message: string | undefined,
      headers: Headers | undefined
    ) {
      super(message || "API Error");
      this.name = "APIError";
      this.status = status;
      this.error = error;
      this.headers = headers;
      this.code = (error?.code as string) || null;
    }
  }

  class MockLengthFinishReasonError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "LengthFinishReasonError";
    }
  }

  class MockContentFilterFinishReasonError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ContentFilterFinishReasonError";
    }
  }

  function MockOpenAI() {
    return {
      responses: {
        parse: mockResponsesParse,
      },
    };
  }

  MockOpenAI.APIError = MockAPIError;

  return {
    default: MockOpenAI,
    APIError: MockAPIError,
    LengthFinishReasonError: MockLengthFinishReasonError,
    ContentFilterFinishReasonError: MockContentFilterFinishReasonError,
  };
});

// Mock zodTextFormat helper
vi.mock("openai/helpers/zod", () => ({
  zodTextFormat: vi.fn((schema, name) => ({ schema, name })),
}));

// Import after mocking
const { generateFlashcards, OpenAIServiceError } = await import("./openai.service");
const OpenAI = (await import("openai")).default;
const { LengthFinishReasonError, ContentFilterFinishReasonError } = await import("openai/error");

describe("generateFlashcards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponsesParse.mockResolvedValue(mockResponsesParseResponse);
  });

  it("should generate flashcards from valid text", async () => {
    const inputText = "TypeScript is a strongly typed programming language.";

    const result = await generateFlashcards(inputText);

    expect(result).toEqual(mockFlashcardsData);
    expect(mockResponsesParse).toHaveBeenCalledTimes(1);
    expect(mockResponsesParse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        input: expect.stringContaining(inputText),
        temperature: 0.7,
      })
    );
  });

  it("should throw error for empty text", async () => {
    await expect(generateFlashcards("")).rejects.toThrow(OpenAIServiceError);
    await expect(generateFlashcards("")).rejects.toThrow("Text cannot be empty after sanitization");
  });

  it("should throw error for whitespace-only text", async () => {
    await expect(generateFlashcards("   \n\t  ")).rejects.toThrow(OpenAIServiceError);
    await expect(generateFlashcards("   \n\t  ")).rejects.toThrow("Text cannot be empty after sanitization");
  });

  it("should trim whitespace from input text", async () => {
    const inputText = "  Some text with spaces  \n";

    await generateFlashcards(inputText);

    expect(mockResponsesParse).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.stringContaining("Some text with spaces"),
      })
    );
  });

  it("should throw error when output_parsed is missing", async () => {
    mockResponsesParse.mockResolvedValue({
      ...mockResponsesParseResponse,
      output_parsed: null,
    });

    await expect(generateFlashcards("test")).rejects.toThrow(OpenAIServiceError);
    await expect(generateFlashcards("test")).rejects.toThrow("No parsed output received from OpenAI");
  });

  it("should handle LengthFinishReasonError", async () => {
    mockResponsesParse.mockRejectedValue(new LengthFinishReasonError());

    await expect(generateFlashcards("test")).rejects.toThrow(OpenAIServiceError);
    await expect(generateFlashcards("test")).rejects.toThrow("Response truncated: content too long");
  });

  it("should handle ContentFilterFinishReasonError", async () => {
    mockResponsesParse.mockRejectedValue(new ContentFilterFinishReasonError());

    await expect(generateFlashcards("test")).rejects.toThrow(OpenAIServiceError);
    await expect(generateFlashcards("test")).rejects.toThrow("Response blocked by content filter");
  });

  it("should handle rate limiting (429) error", async () => {
    const rateLimitError = new OpenAI.APIError(
      429,
      { code: "rate_limit_exceeded" },
      "Rate limit exceeded",
      new Headers()
    );
    mockResponsesParse.mockRejectedValue(rateLimitError);

    await expect(generateFlashcards("test")).rejects.toThrow(OpenAIServiceError);
    await expect(generateFlashcards("test")).rejects.toThrow(
      "AI generation service is temporarily rate-limited. Please try again in a few moments."
    );
  });

  it("should handle server error (500+)", async () => {
    const serverError = new OpenAI.APIError(
      503,
      { code: "service_unavailable" },
      "Internal server error",
      new Headers()
    );
    mockResponsesParse.mockRejectedValue(serverError);

    await expect(generateFlashcards("test")).rejects.toThrow(OpenAIServiceError);
    await expect(generateFlashcards("test")).rejects.toThrow(
      "AI generation service is temporarily unavailable. Please try again later."
    );
  });

  it("should handle generic API errors", async () => {
    const apiError = new OpenAI.APIError(400, { code: "bad_request" }, "Bad request", new Headers());
    mockResponsesParse.mockRejectedValue(apiError);

    await expect(generateFlashcards("test")).rejects.toThrow(OpenAIServiceError);
    await expect(generateFlashcards("test")).rejects.toThrow("OpenAI API error: Bad request");
  });

  it("should handle unexpected errors", async () => {
    const unexpectedError = new Error("Something went wrong");
    mockResponsesParse.mockRejectedValue(unexpectedError);

    await expect(generateFlashcards("test")).rejects.toThrow(OpenAIServiceError);
    await expect(generateFlashcards("test")).rejects.toThrow(
      "Failed to generate flashcards due to an unexpected error"
    );
  });

  it("should pass correct temperature parameter", async () => {
    await generateFlashcards("test text");

    expect(mockResponsesParse).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.7,
      })
    );
  });

  it("should include instructions in the input", async () => {
    await generateFlashcards("test text");

    expect(mockResponsesParse).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.stringContaining("Generate educational flashcards"),
      })
    );
  });
});
