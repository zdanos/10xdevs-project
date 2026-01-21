/**
 * DeckGrid - Responsive grid layout for deck cards
 *
 * Displays deck cards in a responsive grid that adapts based on screen size:
 * - Mobile (< 768px): 1 column
 * - Tablet (768px - 1024px): 2 columns
 * - Desktop (> 1024px): 3 columns
 *
 * Uses CSS Grid for flexible, accessible layout with proper gap spacing.
 */

import DeckCard from "./DeckCard";
import type { DeckDTO } from "@/types";

interface DeckGridProps {
  decks: DeckDTO[];
  locale: string;
}

export default function DeckGrid({ decks, locale }: DeckGridProps) {
  // Defensive check - should not render if no decks
  if (decks.length === 0) {
    return null;
  }

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3" aria-label="Deck collection">
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} locale={locale} />
      ))}
    </section>
  );
}
