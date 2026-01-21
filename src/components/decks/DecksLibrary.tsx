/**
 * DecksLibrary - Main container component for Deck Library view
 *
 * Orchestrates the entire deck library interface including:
 * - Conditional rendering based on state (loading, error, empty, content)
 * - Search and filtering UI
 * - Deck creation modal
 * - Deck grid display
 *
 * This is a React island component hydrated with client:load in Astro
 */

import { useDecksLibrary } from "./hooks/useDecksLibrary";
import DeckGrid from "./DeckGrid";
import SearchFilter from "./SearchFilter";
import CreateDeckButton from "./CreateDeckButton";
import CreateDeckModal from "./CreateDeckModal";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import EmptyState from "./EmptyState";
import NoResultsState from "./NoResultsState";
import type { DeckDTO, ApiError } from "@/types";

interface DecksLibraryProps {
  initialDecks: DeckDTO[];
  initialError?: ApiError | null;
  locale: string;
}

export default function DecksLibrary({ initialDecks, initialError, locale }: DecksLibraryProps) {
  const { state, createDeck, handleSearch, openCreateModal, closeCreateModal, retryFetch } = useDecksLibrary({
    initialDecks,
    initialError,
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleCreateDeck = async (command: { name: string }) => {
    await createDeck(command);
    // Modal will close automatically on success (handled in hook)
  };

  const handleClearSearch = () => {
    handleSearch("");
  };

  // ============================================================================
  // Conditional Rendering Logic
  // ============================================================================

  // Loading state - show skeleton loaders
  if (state.isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <LoadingState />
      </div>
    );
  }

  // Error state - show error message with retry
  if (state.error) {
    return (
      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <ErrorState error={state.error} onRetry={retryFetch} />
      </div>
    );
  }

  // Empty state - no decks exist
  if (state.decks.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <EmptyState onCreateClick={openCreateModal} />

        {/* Create Deck Modal */}
        <CreateDeckModal
          isOpen={state.showCreateModal}
          onClose={closeCreateModal}
          onSubmit={handleCreateDeck}
          isSubmitting={state.isCreating}
          error={state.createError}
        />
      </div>
    );
  }

  // Main content - decks exist
  return (
    <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
      {/* Header Section */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Decks</h1>
          <p className="mt-1 text-sm text-slate-600">
            {state.decks.length} {state.decks.length === 1 ? "deck" : "decks"}
          </p>
        </div>
        <CreateDeckButton onClick={openCreateModal} disabled={state.isCreating} />
      </div>

      {/* Search Filter */}
      <div className="mb-6">
        <SearchFilter value={state.searchQuery} onChange={handleSearch} placeholder="Search decks..." />
      </div>

      {/* Content Section - Conditional */}
      {state.filteredDecks.length === 0 && state.searchQuery !== "" ? (
        // No results for search query
        <NoResultsState searchQuery={state.searchQuery} onClearSearch={handleClearSearch} />
      ) : (
        // Deck Grid
        <DeckGrid decks={state.filteredDecks} locale={locale} />
      )}

      {/* Create Deck Modal */}
      <CreateDeckModal
        isOpen={state.showCreateModal}
        onClose={closeCreateModal}
        onSubmit={handleCreateDeck}
        isSubmitting={state.isCreating}
        error={state.createError}
      />
    </div>
  );
}
