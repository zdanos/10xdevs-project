/**
 * useGeneratorState - Custom hook for managing generator view state
 * Handles API calls, state transitions, and computed values
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type {
  GeneratorViewState,
  StagingFlashcard,
  GenerateFlashcardsResponseDTO,
  ProfileDTO,
  DeckDTO,
  CreateFlashcardCommand,
  ApiError,
} from "@/types";

const initialState: GeneratorViewState = {
  sourceText: "",
  quotaRemaining: 10,
  isGenerating: false,
  generationError: null,
  generationId: null,
  stagingCards: [],
  editingCardId: null,
  isSaving: false,
  saveError: null,
  showDeckModal: false,
  decks: [],
  isLoadingDecks: false,
};

export function useGeneratorState() {
  const [state, setState] = useState<GeneratorViewState>(initialState);

  // Ref to track if we're in the process of saving and navigating
  // This prevents beforeunload warning during successful save
  const isSavingAndNavigatingRef = useRef(false);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const canGenerate = useMemo(() => {
    return (
      state.sourceText.length >= 500 &&
      state.sourceText.length <= 5000 &&
      state.quotaRemaining > 0 &&
      !state.isGenerating
    );
  }, [state.sourceText, state.quotaRemaining, state.isGenerating]);

  const acceptedCards = useMemo(() => {
    return state.stagingCards.filter((c) => c.status === "accepted" || c.status === "edited");
  }, [state.stagingCards]);

  const canSave = useMemo(() => {
    return acceptedCards.length > 0 && !state.isSaving;
  }, [acceptedCards, state.isSaving]);

  // ============================================================================
  // Action Functions
  // ============================================================================

  const fetchQuotaInfo = useCallback(async () => {
    try {
      const response = await fetch("/api/profile");
      if (!response.ok) {
        throw new Error("Failed to fetch quota");
      }
      const data: ProfileDTO = await response.json();

      // Check if 24 hours have passed since last reset
      let remaining: number;

      if (data.last_reset_date) {
        const lastResetTime = new Date(data.last_reset_date).getTime();
        const currentTime = Date.now();
        const hoursSinceReset = (currentTime - lastResetTime) / (1000 * 60 * 60);

        // Optimistic assumption: if 24+ hours passed, user gets full quota
        if (hoursSinceReset >= 24) {
          remaining = 10; // Full quota available
        } else {
          remaining = 10 - data.generations_count;
        }
      } else {
        // No reset date yet (new user), assume full quota
        remaining = 10 - data.generations_count;
      }

      setState((prev) => ({
        ...prev,
        quotaRemaining: remaining,
      }));
    } catch (error) {
      console.error("Error fetching quota:", error);
      // Don't block UI, use default quota
      setState((prev) => ({ ...prev, quotaRemaining: 10 }));
    }
  }, []);

  const handleTextChange = useCallback((text: string) => {
    setState((prev) => ({ ...prev, sourceText: text }));
  }, []);

  const handleGenerate = useCallback(async () => {
    setState((prev) => ({ ...prev, isGenerating: true, generationError: null }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: state.sourceText }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: ApiError = await response.json();

        // Handle quota exceeded (403)
        if (response.status === 403) {
          const retryAfterHours = error.retry_after ? (error.retry_after / 3600).toFixed(1) : "Unknown";

          setState((prev) => ({
            ...prev,
            isGenerating: false,
            quotaRemaining: 0,
            generationError: `Daily limit reached. Quota resets in ${retryAfterHours} hours.`,
          }));
          return;
        }

        // Handle service unavailable (503)
        if (response.status === 503) {
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            generationError: "AI service temporarily unavailable. Please try again in a few moments.",
          }));
          return;
        }

        throw new Error(error.message);
      }

      const data: GenerateFlashcardsResponseDTO = await response.json();

      // Check for empty response
      if (data.flashcards.length === 0) {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          generationError: "No flashcards could be generated from this text. Try different content.",
        }));
        return;
      }

      // Transform to StagingFlashcard[]
      const stagingCards: StagingFlashcard[] = data.flashcards.map((fc) => ({
        id: crypto.randomUUID(),
        front: fc.front,
        back: fc.back,
        status: "pending",
        isEdited: false,
      }));

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        generationId: data.generation_id,
        quotaRemaining: data.quota_remaining,
        stagingCards,
      }));
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          generationError: "Request timed out. The text may be too complex. Try shorter text.",
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          generationError:
            error instanceof Error ? error.message : "Network error. Please check your connection and try again.",
        }));
      }
    }
  }, [state.sourceText]);

  const handleEditCard = useCallback((cardId: string) => {
    setState((prev) => ({ ...prev, editingCardId: cardId }));
  }, []);

  const handleSaveEdit = useCallback((cardId: string, front: string, back: string) => {
    setState((prev) => ({
      ...prev,
      stagingCards: prev.stagingCards.map((card) =>
        card.id === cardId ? { ...card, front, back, isEdited: true, status: "edited" } : card
      ),
      editingCardId: null,
    }));
  }, []);

  const handleCancelEdit = useCallback(() => {
    setState((prev) => ({ ...prev, editingCardId: null }));
  }, []);

  const handleAcceptCard = useCallback((cardId: string) => {
    setState((prev) => ({
      ...prev,
      stagingCards: prev.stagingCards.map((card) => (card.id === cardId ? { ...card, status: "accepted" } : card)),
    }));
  }, []);

  const handleRejectCard = useCallback((cardId: string) => {
    setState((prev) => ({
      ...prev,
      stagingCards: prev.stagingCards.filter((card) => card.id !== cardId),
    }));
  }, []);

  const handleOpenSaveModal = useCallback(async () => {
    setState((prev) => ({ ...prev, showDeckModal: true, isLoadingDecks: true }));

    try {
      const response = await fetch("/api/decks");
      if (!response.ok) {
        throw new Error("Failed to fetch decks");
      }

      const decks: DeckDTO[] = await response.json();

      setState((prev) => ({
        ...prev,
        decks,
        isLoadingDecks: false,
      }));
    } catch (error) {
      console.error("Error fetching decks:", error);
      setState((prev) => ({
        ...prev,
        isLoadingDecks: false,
        saveError: "Failed to load decks",
      }));
    }
  }, []);

  const handleCloseSaveModal = useCallback(() => {
    setState((prev) => ({ ...prev, showDeckModal: false, saveError: null }));
  }, []);

  const createDeck = useCallback(async (name: string): Promise<string> => {
    const response = await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message);
    }

    const deck: DeckDTO = await response.json();
    return deck.id;
  }, []);

  const saveFlashcardsToDeck = useCallback(
    async (deckId: string) => {
      // Filter accepted and edited cards
      const cardsToSave = state.stagingCards.filter((c) => c.status === "accepted" || c.status === "edited");

      // Map to CreateFlashcardCommand[]
      const payload: CreateFlashcardCommand[] = cardsToSave.map((card) => ({
        deck_id: deckId,
        front: card.front,
        back: card.back,
        creation_source: card.isEdited ? "EditedAI" : "AI",
        generation_id: state.generationId ?? undefined,
      }));

      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.message);
      }

      return await response.json();
    },
    [state.stagingCards, state.generationId]
  );

  const handleSaveToExistingDeck = useCallback(
    async (deckId: string) => {
      setState((prev) => ({ ...prev, isSaving: true, saveError: null }));

      try {
        await saveFlashcardsToDeck(deckId);

        // Set flag to prevent beforeunload warning during navigation
        isSavingAndNavigatingRef.current = true;

        // Clear staging cards and close modal
        setState((prev) => ({
          ...prev,
          stagingCards: [],
          showDeckModal: false,
          isSaving: false,
        }));

        // Navigate to deck view
        window.location.href = `/app/decks/${deckId}`;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          saveError: error instanceof Error ? error.message : "Failed to save flashcards",
        }));
      }
    },
    [saveFlashcardsToDeck]
  );

  const handleSaveToNewDeck = useCallback(
    async (deckName: string) => {
      setState((prev) => ({ ...prev, isSaving: true, saveError: null }));

      try {
        // Step 1: Create deck
        const deckId = await createDeck(deckName);

        // Step 2: Save cards to deck
        await saveFlashcardsToDeck(deckId);

        // Set flag to prevent beforeunload warning during navigation
        isSavingAndNavigatingRef.current = true;

        // Clear staging cards and close modal
        setState((prev) => ({
          ...prev,
          stagingCards: [],
          showDeckModal: false,
          isSaving: false,
        }));

        // Navigate to deck view
        window.location.href = `/app/decks/${deckId}`;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          saveError: error instanceof Error ? error.message : "Failed to save flashcards",
        }));
      }
    },
    [createDeck, saveFlashcardsToDeck]
  );

  // ============================================================================
  // Effects
  // ============================================================================

  // Fetch quota on mount
  useEffect(() => {
    fetchQuotaInfo();
  }, [fetchQuotaInfo]);

  // Browser beforeunload warning for unsaved cards
  useEffect(() => {
    const hasUnsavedCards = state.stagingCards.length > 0;

    if (hasUnsavedCards) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // Don't show warning if we're in the middle of saving and navigating
        if (isSavingAndNavigatingRef.current) {
          return;
        }

        e.preventDefault();
        e.returnValue = "You have unsaved flashcards. Are you sure you want to leave?";
        return e.returnValue;
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [state.stagingCards]);

  return {
    state,
    actions: {
      handleTextChange,
      handleGenerate,
      handleEditCard,
      handleSaveEdit,
      handleCancelEdit,
      handleAcceptCard,
      handleRejectCard,
      handleOpenSaveModal,
      handleCloseSaveModal,
      handleSaveToExistingDeck,
      handleSaveToNewDeck,
    },
    computed: {
      canGenerate,
      canSave,
      acceptedCards,
    },
  };
}
