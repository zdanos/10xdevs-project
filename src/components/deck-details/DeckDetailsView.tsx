/**
 * DeckDetailsView - Main client-side component for Deck Details view
 *
 * Orchestrates all deck and flashcard operations using the useDeckDetails hook.
 * Renders child components and manages their state and interactions.
 *
 * Features:
 * - Deck management (rename, delete)
 * - Flashcard CRUD operations
 * - Optimistic UI updates
 * - Error handling with toast notifications
 * - Modal/drawer state management
 */

import { ArrowLeft, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeckDTO, FlashcardDTO, ApiError } from "@/types";
import { useDeckDetails } from "./hooks/useDeckDetails";
import { DeckHeader } from "./DeckHeader";
import { FlashcardList } from "./FlashcardList";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import CardFormDrawer from "@/components/ui/CardFormDrawer";

interface DeckDetailsViewProps {
  initialDeck: DeckDTO;
  initialFlashcards: FlashcardDTO[];
  initialError: ApiError | null;
}

export function DeckDetailsView({ initialDeck, initialFlashcards, initialError }: DeckDetailsViewProps) {
  const { state, actions } = useDeckDetails({
    initialDeck,
    initialFlashcards,
  });

  // Handle initial SSR errors
  if (initialError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Failed to load deck</h2>
          <p className="mt-2 text-gray-600">{initialError.message}</p>
          <button
            onClick={() => actions.refreshFlashcards()}
            className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Retry
          </button>
          <a href="/app/decks" className="mt-4 block text-blue-600 hover:underline">
            Back to Library
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => (window.location.href = "/app/decks")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Library</span>
        </Button>
      </div>

      {/* Deck Header */}
      <DeckHeader
        deck={state.deck}
        isRenaming={state.isRenamingDeck}
        isDeletingDeck={state.isDeletingDeck}
        onRename={actions.renameDeck}
        onDelete={actions.openDeleteDeckDialog}
        onStudy={actions.navigateToStudy}
      />

      {/* Flashcard List */}
      <div className="mb-6">
        {state.flashcardsError ? (
          <div className="text-center rounded-lg border-2 border-red-200 bg-red-50 p-8">
            <p className="text-red-600">{state.flashcardsError.message}</p>
            <button
              onClick={() => actions.refreshFlashcards()}
              className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <FlashcardList
            flashcards={state.flashcards}
            isLoading={state.isLoadingFlashcards}
            onEditCard={(card) => actions.openCardForm("edit", card)}
            onDeleteCard={(id) => {
              const card = state.flashcards.find((c) => c.id === id);
              if (card) actions.openDeleteCardDialog(card);
            }}
            onCreateCard={() => actions.openCardForm("create")}
          />
        )}
      </div>

      {/* Add Card Buttons - sticky on mobile, inline on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-4 shadow-lg sm:relative sm:inset-auto sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:justify-end">
          {/* Generate with AI button - primary action */}
          <Button
            onClick={() => (window.location.href = "/app/generate")}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
            disabled={state.isSavingCard || state.isDeletingCard}
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate with AI</span>
          </Button>

          {/* Manual creation button - secondary action */}
          <Button
            onClick={() => actions.openCardForm("create")}
            variant="outline"
            className="flex items-center justify-center gap-2 border-gray-300"
            disabled={state.isSavingCard || state.isDeletingCard}
          >
            <Plus className="h-4 w-4" />
            <span>Add Manually</span>
          </Button>
        </div>
      </div>

      {/* Spacer for fixed bottom bar on mobile */}
      <div className="h-32 sm:hidden" aria-hidden="true" />

      {/* Card Form Drawer */}
      <CardFormDrawer
        isOpen={state.showCardForm}
        mode={state.cardFormMode}
        initialData={
          state.editingCard
            ? {
                front: state.editingCard.front,
                back: state.editingCard.back,
              }
            : undefined
        }
        isSaving={state.isSavingCard}
        saveError={state.saveCardError}
        onSave={(front, back) => {
          if (state.cardFormMode === "edit" && state.editingCard) {
            actions.updateCard(state.editingCard.id, { front, back });
          } else {
            actions.createCard(front, back);
          }
        }}
        onCancel={actions.closeCardForm}
      />

      {/* Delete Card Confirmation Dialog */}
      {state.deletingCardId && (
        <DeleteConfirmationDialog
          isOpen={state.showDeleteCardDialog}
          type="flashcard"
          itemName={state.flashcards.find((c) => c.id === state.deletingCardId)?.front.substring(0, 100) || ""}
          isDeleting={state.isDeletingCard}
          error={state.deleteCardError}
          onConfirm={() => actions.deleteCard(state.deletingCardId!)}
          onCancel={actions.closeDeleteCardDialog}
        />
      )}

      {/* Delete Deck Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={state.showDeleteDeckDialog}
        type="deck"
        itemName={state.deck.name}
        itemCount={state.deck.card_count}
        isDeleting={state.isDeletingDeck}
        error={state.deleteDeckError}
        onConfirm={actions.deleteDeck}
        onCancel={actions.closeDeleteDeckDialog}
      />
    </div>
  );
}
