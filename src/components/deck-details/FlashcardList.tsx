/**
 * FlashcardList - Scrollable container for flashcard items
 *
 * Renders all flashcards in the deck with responsive grid layout.
 * Handles empty state, loading state, and list updates.
 *
 * Features:
 * - Responsive grid layout (1 col mobile, 2 cols tablet, 3 cols desktop)
 * - Empty state when no flashcards
 * - Loading state with skeleton cards
 * - Maps flashcards to FlashcardItem components
 */

import type { FlashcardDTO } from "@/types";
import { FlashcardItem } from "./FlashcardItem";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";

interface FlashcardListProps {
  flashcards: FlashcardDTO[];
  isLoading: boolean;
  onEditCard: (card: FlashcardDTO) => void;
  onDeleteCard: (id: string) => void;
  onCreateCard: () => void;
}

export function FlashcardList({ flashcards, isLoading, onEditCard, onDeleteCard, onCreateCard }: FlashcardListProps) {
  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Empty state
  if (flashcards.length === 0) {
    return <EmptyState onCreate={onCreateCard} />;
  }

  // Render flashcard grid
  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {flashcards.map((card) => (
        <FlashcardItem
          key={card.id}
          flashcard={card}
          onEdit={() => onEditCard(card)}
          onDelete={() => onDeleteCard(card.id)}
        />
      ))}
    </section>
  );
}
