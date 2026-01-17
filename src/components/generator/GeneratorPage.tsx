/**
 * GeneratorPage - Main component for AI flashcard generation flow
 *
 * This component orchestrates the three-phase workflow:
 * 1. Input Phase: User pastes notes
 * 2. Processing Phase: AI generation
 * 3. Staging Phase: Verify and edit cards
 */

import { useGeneratorState } from "./hooks/useGeneratorState";
import QuotaIndicator from "./QuotaIndicator";
import SourceInput from "./SourceInput";
import StagingArea from "./StagingArea";
import ActionToolbar from "./ActionToolbar";
import CardFormDrawer from "@/components/ui/CardFormDrawer";
import DeckSelectionModal from "./DeckSelectionModal";

export default function GeneratorPage() {
  const { state, actions, computed } = useGeneratorState();

  // Find the card being edited
  const editingCard = state.editingCardId ? state.stagingCards.find((c) => c.id === state.editingCardId) : null;

  return (
    <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <header className="space-y-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900">Generate Flashcards</h1>
            <p className="text-neutral-600 mt-2">
              Paste your notes and let AI transform them into study-ready flashcards
            </p>
          </div>

          {/* Quota Indicator */}
          <QuotaIndicator remaining={state.quotaRemaining} max={10} />
        </header>

        {/* Error Banner - Generation Error */}
        {state.generationError && (
          <div className="p-4 rounded-lg bg-red-50 border-2 border-red-200 flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Generation Error</h3>
              <p className="text-sm text-red-700 mt-1">{state.generationError}</p>
            </div>
            <button
              onClick={() => actions.handleTextChange(state.sourceText)}
              className="text-red-600 hover:text-red-800 cursor-pointer"
              aria-label="Dismiss error"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="space-y-8">
          {/* Input Phase - Show when no staging cards or still generating */}
          {(state.stagingCards.length === 0 || state.isGenerating) && (
            <div className="bg-white rounded-xl border-2 border-neutral-200 p-6 shadow-sm">
              <SourceInput value={state.sourceText} onChange={actions.handleTextChange} disabled={state.isGenerating} />
            </div>
          )}

          {/* Staging Phase - Show when cards exist or generating */}
          {(state.stagingCards.length > 0 || state.isGenerating) && (
            <div className="bg-white rounded-xl border-2 border-neutral-200 p-6 shadow-sm">
              <StagingArea
                cards={state.stagingCards}
                isLoading={state.isGenerating}
                onEditCard={actions.handleEditCard}
                onAcceptCard={actions.handleAcceptCard}
                onRejectCard={actions.handleRejectCard}
              />
            </div>
          )}

          {/* Helpful Tips - Show in input phase */}
          {state.stagingCards.length === 0 && !state.isGenerating && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Tips for Better Results</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Include clear, well-structured notes with key concepts</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>500-5000 characters works best (about 1-2 pages of notes)</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Review and edit generated cards before saving</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>You have {state.quotaRemaining} generation{state.quotaRemaining !== 1 ? "s" : ""} remaining today</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Action Toolbar - Outside padded container for full-width on mobile */}
      <ActionToolbar
        canGenerate={computed.canGenerate}
        canSave={computed.canSave}
        isGenerating={state.isGenerating}
        isSaving={state.isSaving}
        acceptedCount={computed.acceptedCards.length}
        onGenerate={actions.handleGenerate}
        onSave={actions.handleOpenSaveModal}
      />

      {/* Modals */}
      <CardFormDrawer
        isOpen={state.editingCardId !== null}
        mode="edit"
        initialData={editingCard ? { front: editingCard.front, back: editingCard.back } : undefined}
        onSave={(front, back) => {
          if (state.editingCardId) {
            actions.handleSaveEdit(state.editingCardId, front, back);
          }
        }}
        onCancel={actions.handleCancelEdit}
      />

      <DeckSelectionModal
        isOpen={state.showDeckModal}
        decks={state.decks}
        isLoading={state.isLoadingDecks}
        cardCount={computed.acceptedCards.length}
        onSelectDeck={actions.handleSaveToExistingDeck}
        onCreateDeck={actions.handleSaveToNewDeck}
        onCancel={actions.handleCloseSaveModal}
      />
    </div>
  );
}
