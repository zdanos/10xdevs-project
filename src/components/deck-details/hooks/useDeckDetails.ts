/**
 * useDeckDetails - Custom hook for managing Deck Details view state
 *
 * Centralizes all state management and operations for the Deck Details view:
 * - Deck operations (rename, delete)
 * - Flashcard CRUD operations
 * - Optimistic updates with rollback
 * - Error handling
 * - UI state management (modals, forms)
 *
 * @param initialDeck - SSR-provided initial deck data
 * @param initialFlashcards - SSR-provided initial flashcards
 * @returns State and actions for Deck Details view
 */

import { useState, useCallback } from "react";
import type {
  DeckDTO,
  FlashcardDTO,
  ApiError,
  UpdateDeckCommand,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  ListFlashcardsResponseDTO,
  DeckDetailsViewState,
} from "@/types";

interface UseDeckDetailsParams {
  initialDeck: DeckDTO;
  initialFlashcards: FlashcardDTO[];
}

interface DeckDetailsActions {
  // Deck operations
  renameDeck: (name: string) => Promise<void>;
  deleteDeck: () => Promise<void>;
  openDeleteDeckDialog: () => void;
  closeDeleteDeckDialog: () => void;

  // Flashcard operations
  refreshFlashcards: () => Promise<void>;
  createCard: (front: string, back: string) => Promise<void>;
  updateCard: (id: string, data: UpdateFlashcardCommand) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;

  // UI state operations
  openCardForm: (mode: "create" | "edit", card?: FlashcardDTO) => void;
  closeCardForm: () => void;
  openDeleteCardDialog: (card: FlashcardDTO) => void;
  closeDeleteCardDialog: () => void;

  // Navigation
  navigateToStudy: () => void;
}

interface UseDeckDetailsReturn {
  state: DeckDetailsViewState;
  actions: DeckDetailsActions;
}

export function useDeckDetails({ initialDeck, initialFlashcards }: UseDeckDetailsParams): UseDeckDetailsReturn {
  // ============================================================================
  // State Variables
  // ============================================================================

  // Core data
  const [deck, setDeck] = useState<DeckDTO>(initialDeck);
  const [flashcards, setFlashcards] = useState<FlashcardDTO[]>(initialFlashcards);

  // Flashcard operations
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState<boolean>(false);
  const [flashcardsError, setFlashcardsError] = useState<ApiError | null>(null);

  // Deck rename operation
  const [isRenamingDeck, setIsRenamingDeck] = useState<boolean>(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [originalDeckName, setOriginalDeckName] = useState<string | null>(null);

  // Deck delete operation
  const [isDeletingDeck, setIsDeletingDeck] = useState<boolean>(false);
  const [deleteDeckError, setDeleteDeckError] = useState<string | null>(null);
  const [showDeleteDeckDialog, setShowDeleteDeckDialog] = useState<boolean>(false);

  // Card form state
  const [showCardForm, setShowCardForm] = useState<boolean>(false);
  const [cardFormMode, setCardFormMode] = useState<"create" | "edit">("create");
  const [editingCard, setEditingCard] = useState<FlashcardDTO | null>(null);
  const [isSavingCard, setIsSavingCard] = useState<boolean>(false);
  const [saveCardError, setSaveCardError] = useState<string | null>(null);

  // Card delete operation
  const [isDeletingCard, setIsDeletingCard] = useState<boolean>(false);
  const [deleteCardError, setDeleteCardError] = useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [showDeleteCardDialog, setShowDeleteCardDialog] = useState<boolean>(false);

  // ============================================================================
  // Deck Operations
  // ============================================================================

  /**
   * Renames the deck with optimistic update and rollback on error
   * @param name - New deck name
   */
  const renameDeck = useCallback(
    async (name: string) => {
      const trimmedName = name.trim();

      // Validate - no change
      if (trimmedName === deck.name) {
        return;
      }

      // Store original for rollback
      setOriginalDeckName(deck.name);
      setIsRenamingDeck(true);
      setRenameError(null);

      // Optimistic update
      setDeck((prev) => ({ ...prev, name: trimmedName }));

      try {
        const response = await fetch(`/api/decks/${deck.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName } as UpdateDeckCommand),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to rename deck");
        }

        const updatedDeck: DeckDTO = await response.json();
        setDeck(updatedDeck);
        setOriginalDeckName(null);
      } catch (err) {
        // Rollback to original name
        if (originalDeckName) {
          setDeck((prev) => ({ ...prev, name: originalDeckName }));
        }
        setRenameError(err instanceof Error ? err.message : "Failed to rename deck");
      } finally {
        setIsRenamingDeck(false);
      }
    },
    [deck.id, deck.name, originalDeckName]
  );

  /**
   * Deletes the deck and navigates to library on success
   */
  const deleteDeck = useCallback(async () => {
    setIsDeletingDeck(true);
    setDeleteDeckError(null);

    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete deck");
      }

      // Navigate to deck library on success
      window.location.href = "/app/decks";
    } catch (err) {
      setDeleteDeckError(err instanceof Error ? err.message : "Failed to delete deck");
      setShowDeleteDeckDialog(false);
    } finally {
      setIsDeletingDeck(false);
    }
  }, [deck.id]);

  /**
   * Opens the delete deck confirmation dialog
   */
  const openDeleteDeckDialog = useCallback(() => {
    setShowDeleteDeckDialog(true);
    setDeleteDeckError(null);
  }, []);

  /**
   * Closes the delete deck confirmation dialog
   */
  const closeDeleteDeckDialog = useCallback(() => {
    setShowDeleteDeckDialog(false);
    setDeleteDeckError(null);
  }, []);

  // ============================================================================
  // Flashcard Operations
  // ============================================================================

  /**
   * Refreshes flashcards from the API
   */
  const refreshFlashcards = useCallback(async () => {
    setIsLoadingFlashcards(true);
    setFlashcardsError(null);

    try {
      const response = await fetch(`/api/flashcards?deck_id=${deck.id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch flashcards");
      }

      const data: ListFlashcardsResponseDTO = await response.json();
      setFlashcards(data);
    } catch (err) {
      setFlashcardsError({
        error: "Fetch Error",
        message: err instanceof Error ? err.message : "Failed to fetch flashcards",
      });
    } finally {
      setIsLoadingFlashcards(false);
    }
  }, [deck.id]);

  /**
   * Creates a new flashcard
   * @param front - Question text
   * @param back - Answer text
   */
  const createCard = useCallback(
    async (front: string, back: string) => {
      setIsSavingCard(true);
      setSaveCardError(null);

      try {
        const command: CreateFlashcardCommand = {
          deck_id: deck.id,
          front: front.trim(),
          back: back.trim(),
          creation_source: "Manual",
        };

        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          // Handle 404 (deck deleted elsewhere)
          if (response.status === 404) {
            window.location.href = "/app/decks";
            return;
          }

          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create flashcard");
        }

        const newCard: FlashcardDTO = await response.json();

        // Add to local state
        setFlashcards((prev) => [...prev, newCard]);

        // Update deck card count
        setDeck((prev) => ({ ...prev, card_count: prev.card_count + 1 }));

        // Close form
        setShowCardForm(false);
        setEditingCard(null);
      } catch (err) {
        setSaveCardError(err instanceof Error ? err.message : "Failed to create flashcard");
      } finally {
        setIsSavingCard(false);
      }
    },
    [deck.id]
  );

  /**
   * Updates an existing flashcard
   * @param id - Flashcard ID
   * @param data - Update payload (front and/or back)
   */
  const updateCard = useCallback(
    async (id: string, data: UpdateFlashcardCommand) => {
      setIsSavingCard(true);
      setSaveCardError(null);

      try {
        const response = await fetch(`/api/flashcards/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          // Handle 404 (card deleted elsewhere)
          if (response.status === 404) {
            // Refresh list to sync state
            await refreshFlashcards();
            setShowCardForm(false);
            setEditingCard(null);
            return;
          }

          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update flashcard");
        }

        const updatedCard: FlashcardDTO = await response.json();

        // Update in local state
        setFlashcards((prev) => prev.map((card) => (card.id === id ? updatedCard : card)));

        // Close form
        setShowCardForm(false);
        setEditingCard(null);
      } catch (err) {
        setSaveCardError(err instanceof Error ? err.message : "Failed to update flashcard");
      } finally {
        setIsSavingCard(false);
      }
    },
    [refreshFlashcards]
  );

  /**
   * Deletes a flashcard
   * @param id - Flashcard ID
   */
  const deleteCard = useCallback(async (id: string) => {
    setIsDeletingCard(true);
    setDeleteCardError(null);

    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Handle 404 (card already deleted)
        if (response.status === 404) {
          // Remove from local state silently
          setFlashcards((prev) => prev.filter((card) => card.id !== id));
          setDeck((prev) => ({ ...prev, card_count: Math.max(0, prev.card_count - 1) }));
          setShowDeleteCardDialog(false);
          setDeletingCardId(null);
          return;
        }

        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete flashcard");
      }

      // Remove from local state
      setFlashcards((prev) => prev.filter((card) => card.id !== id));

      // Update deck card count
      setDeck((prev) => ({ ...prev, card_count: Math.max(0, prev.card_count - 1) }));

      // Close dialog
      setShowDeleteCardDialog(false);
      setDeletingCardId(null);
    } catch (err) {
      setDeleteCardError(err instanceof Error ? err.message : "Failed to delete flashcard");
    } finally {
      setIsDeletingCard(false);
    }
  }, []);

  // ============================================================================
  // UI State Operations
  // ============================================================================

  /**
   * Opens the card form drawer in create or edit mode
   * @param mode - Form mode (create | edit)
   * @param card - Card to edit (required for edit mode)
   */
  const openCardForm = useCallback((mode: "create" | "edit", card?: FlashcardDTO) => {
    setCardFormMode(mode);
    setEditingCard(card || null);
    setShowCardForm(true);
    setSaveCardError(null);
  }, []);

  /**
   * Closes the card form drawer
   */
  const closeCardForm = useCallback(() => {
    setShowCardForm(false);
    setEditingCard(null);
    setSaveCardError(null);
  }, []);

  /**
   * Opens the delete card confirmation dialog
   * @param card - Card to delete
   */
  const openDeleteCardDialog = useCallback((card: FlashcardDTO) => {
    setDeletingCardId(card.id);
    setShowDeleteCardDialog(true);
    setDeleteCardError(null);
  }, []);

  /**
   * Closes the delete card confirmation dialog
   */
  const closeDeleteCardDialog = useCallback(() => {
    setShowDeleteCardDialog(false);
    setDeletingCardId(null);
    setDeleteCardError(null);
  }, []);

  // ============================================================================
  // Navigation
  // ============================================================================

  /**
   * Navigates to study mode for this deck
   */
  const navigateToStudy = useCallback(() => {
    // Validate deck has flashcards
    if (deck.card_count === 0) {
      // This should be handled by disabled button state, but double-check
      return;
    }

    // Navigate to study view (not yet implemented)
    window.location.href = `/app/study/${deck.id}`;
  }, [deck.id, deck.card_count]);

  // ============================================================================
  // Compose State and Actions Objects
  // ============================================================================

  const state: DeckDetailsViewState = {
    deck,
    flashcards,
    isLoadingFlashcards,
    flashcardsError,
    isRenamingDeck,
    renameError,
    originalDeckName,
    isDeletingDeck,
    deleteDeckError,
    showDeleteDeckDialog,
    showCardForm,
    cardFormMode,
    editingCard,
    isSavingCard,
    saveCardError,
    isDeletingCard,
    deleteCardError,
    deletingCardId,
    showDeleteCardDialog,
  };

  const actions: DeckDetailsActions = {
    renameDeck,
    deleteDeck,
    openDeleteDeckDialog,
    closeDeleteDeckDialog,
    refreshFlashcards,
    createCard,
    updateCard,
    deleteCard,
    openCardForm,
    closeCardForm,
    openDeleteCardDialog,
    closeDeleteCardDialog,
    navigateToStudy,
  };

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    state,
    actions,
  };
}
