/**
 * useDecksLibrary - Custom hook for managing Deck Library view state
 *
 * Centralizes all state management and operations for the Deck Library view:
 * - Data fetching and caching
 * - Search/filter logic
 * - Deck creation
 * - Error handling
 * - Modal state management
 *
 * @param initialDecks - SSR-provided initial deck data
 * @param initialError - SSR-provided initial error (if any)
 * @returns State and operations for Deck Library view
 */

import { useState, useMemo, useCallback } from "react";
import type { DeckDTO, ApiError, ListDecksResponseDTO, CreateDeckCommand, DecksLibraryViewState } from "@/types";

interface UseDecksLibraryParams {
  initialDecks: DeckDTO[];
  initialError?: ApiError | null;
}

interface UseDecksLibraryReturn {
  // State
  state: DecksLibraryViewState;

  // Data operations
  fetchDecks: () => Promise<void>;
  createDeck: (command: CreateDeckCommand) => Promise<DeckDTO | null>;

  // UI operations
  handleSearch: (query: string) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  retryFetch: () => Promise<void>;
}

export function useDecksLibrary({ initialDecks, initialError = null }: UseDecksLibraryParams): UseDecksLibraryReturn {
  // ============================================================================
  // State Variables
  // ============================================================================

  const [decks, setDecks] = useState<DeckDTO[]>(initialDecks);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(initialError);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * Alphabetically sorted decks (case-insensitive)
   * Memoized to avoid re-sorting on every render
   */
  const sortedDecks = useMemo(() => {
    return [...decks].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  }, [decks]);

  /**
   * Filtered decks based on search query
   * Filters by case-insensitive substring match on deck name
   */
  const filteredDecks = useMemo(() => {
    if (!searchQuery.trim()) return sortedDecks;

    const query = searchQuery.toLowerCase();
    return sortedDecks.filter((deck) => deck.name.toLowerCase().includes(query));
  }, [sortedDecks, searchQuery]);

  // ============================================================================
  // Data Operations
  // ============================================================================

  /**
   * Fetches all decks from the API
   * Updates state with results or error
   */
  const fetchDecks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/decks");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch decks");
      }

      const data: ListDecksResponseDTO = await response.json();
      setDecks(data);
    } catch (err) {
      setError({
        error: "Fetch Error",
        message: err instanceof Error ? err.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Creates a new deck via API
   * On success: adds deck to state, closes modal
   * On error: displays error in modal, keeps modal open
   *
   * @param command - Deck creation payload
   * @returns Created deck or null if failed
   */
  const createDeck = useCallback(async (command: CreateDeckCommand): Promise<DeckDTO | null> => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create deck");
      }

      const newDeck: DeckDTO = await response.json();

      // Optimistic update - add to state immediately
      setDecks((prev) => [...prev, newDeck]);
      setShowCreateModal(false);

      return newDeck;
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error occurred");
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // ============================================================================
  // UI Operations
  // ============================================================================

  /**
   * Updates search query, triggering filtered deck recomputation
   */
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Opens the create deck modal and clears any previous errors
   */
  const openCreateModal = useCallback(() => {
    setShowCreateModal(true);
    setCreateError(null);
  }, []);

  /**
   * Closes the create deck modal and clears form state
   */
  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setCreateError(null);
  }, []);

  /**
   * Retry fetching decks after an error
   * Convenience wrapper around fetchDecks
   */
  const retryFetch = useCallback(async () => {
    await fetchDecks();
  }, [fetchDecks]);

  // ============================================================================
  // Compose State Object
  // ============================================================================

  const state: DecksLibraryViewState = {
    decks,
    filteredDecks,
    searchQuery,
    isLoading,
    error,
    showCreateModal,
    isCreating,
    createError,
  };

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    state,
    fetchDecks,
    createDeck,
    handleSearch,
    openCreateModal,
    closeCreateModal,
    retryFetch,
  };
}
