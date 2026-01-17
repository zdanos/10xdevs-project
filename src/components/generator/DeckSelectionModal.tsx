/**
 * DeckSelectionModal - Modal for selecting existing deck or creating new one
 * Displays list of user's decks with search/filter capability
 */

import { useState, useMemo, useEffect } from "react";
import type { DeckDTO } from "@/types";

interface DeckSelectionModalProps {
  isOpen: boolean;
  decks: DeckDTO[];
  isLoading: boolean;
  cardCount: number;
  onSelectDeck: (deckId: string) => Promise<void>;
  onCreateDeck: (deckName: string) => Promise<void>;
  onCancel: () => void;
}

interface DeckSelectionState {
  searchQuery: string;
  selectedDeckId: string | null;
  newDeckName: string;
  error: string | null;
}

const MAX_DECK_NAME_LENGTH = 100;

export default function DeckSelectionModal({
  isOpen,
  decks,
  isLoading,
  cardCount,
  onSelectDeck,
  onCreateDeck,
  onCancel,
}: DeckSelectionModalProps) {
  const [state, setState] = useState<DeckSelectionState>({
    searchQuery: "",
    selectedDeckId: null,
    newDeckName: "",
    error: null,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState({
        searchQuery: "",
        selectedDeckId: null,
        newDeckName: "",
        error: null,
      });
      setIsSaving(false);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSaving) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isSaving, onCancel]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Filter decks based on search query
  const filteredDecks = useMemo(() => {
    if (!state.searchQuery) return decks;
    const query = state.searchQuery.toLowerCase();
    return decks.filter((deck) => deck.name.toLowerCase().includes(query));
  }, [decks, state.searchQuery]);

  const handleConfirm = async () => {
    setState((prev) => ({ ...prev, error: null }));
    setIsSaving(true);

    try {
      if (state.selectedDeckId) {
        await onSelectDeck(state.selectedDeckId);
      } else if (state.newDeckName.trim()) {
        if (state.newDeckName.length > MAX_DECK_NAME_LENGTH) {
          setState((prev) => ({ ...prev, error: `Deck name must be ${MAX_DECK_NAME_LENGTH} characters or less` }));
          setIsSaving(false);
          return;
        }
        await onCreateDeck(state.newDeckName.trim());
      } else {
        setState((prev) => ({ ...prev, error: "Please select a deck or enter a new deck name" }));
        setIsSaving(false);
      }
    } catch (error) {
      setIsSaving(false);
      // Error handling is done in the parent component
    }
  };

  const canConfirm = (state.selectedDeckId !== null || state.newDeckName.trim().length > 0) && !isSaving;

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={!isSaving ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-xl max-h-[90vh] w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <div>
              <h2 id="modal-title" className="text-xl font-bold text-neutral-900">
                Save to Deck
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Choose an existing deck or create a new one for {cardCount} card{cardCount !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Search Input */}
            {decks.length > 0 && (
              <div>
                <label htmlFor="deck-search" className="sr-only">
                  Search decks
                </label>
                <div className="relative">
                  <input
                    id="deck-search"
                    type="text"
                    value={state.searchQuery}
                    onChange={(e) => setState((prev) => ({ ...prev, searchQuery: e.target.value }))}
                    placeholder="Search decks..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-neutral-300 focus:outline-none
                      focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Deck List */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-lg border-2 border-neutral-200 animate-pulse">
                    <div className="h-5 bg-neutral-200 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-neutral-200 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : filteredDecks.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredDecks.map((deck) => (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, selectedDeckId: deck.id, newDeckName: "" }))}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200
                      ${
                        state.selectedDeckId === deck.id
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-2"
                          : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-neutral-900 truncate">{deck.name}</h3>
                        <p className="text-sm text-neutral-600 mt-1">
                          {deck.card_count} card{deck.card_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {state.selectedDeckId === deck.id && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-blue-600"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : decks.length > 0 ? (
              <div className="text-center py-8 text-neutral-600">
                <p>No decks found matching &quot;{state.searchQuery}&quot;</p>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-600">
                <p>No decks yet. Create your first deck below.</p>
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-neutral-300" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-sm text-neutral-600">Or create new deck</span>
              </div>
            </div>

            {/* New Deck Section */}
            <div className="space-y-2">
              <label htmlFor="new-deck-name" className="block text-sm font-medium text-neutral-700">
                New Deck Name
              </label>
              <input
                id="new-deck-name"
                type="text"
                value={state.newDeckName}
                onChange={(e) => setState((prev) => ({ ...prev, newDeckName: e.target.value, selectedDeckId: null }))}
                placeholder="Enter deck name..."
                maxLength={MAX_DECK_NAME_LENGTH}
                className="w-full px-4 py-3 rounded-lg border-2 border-neutral-300 focus:outline-none
                  focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Create a new deck for your flashcards</span>
                <span
                  className={`font-mono ${state.newDeckName.length > MAX_DECK_NAME_LENGTH ? "text-red-600" : "text-neutral-600"}`}
                >
                  {state.newDeckName.length}/{MAX_DECK_NAME_LENGTH}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {state.error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{state.error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg
                hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg
                hover:bg-green-700 disabled:bg-neutral-300 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>
                  {state.newDeckName.trim() ? "Create & Save" : "Save"} {cardCount} Card{cardCount !== 1 ? "s" : ""}
                </span>
              )}
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
