/**
 * DeckCard - Individual deck card component
 *
 * Displays a single deck with its name and card count.
 * Serves as a clickable navigation element to the deck details page.
 *
 * Features:
 * - Responsive typography and padding
 * - Hover/focus states with green primary color
 * - Accessible keyboard navigation
 * - Card count badge display
 */

import type { DeckDTO } from "@/types";

interface DeckCardProps {
  deck: DeckDTO;
  locale: string;
}

export default function DeckCard({ deck, locale }: DeckCardProps) {
  const handleClick = () => {
    window.location.href = `/app/decks/${deck.id}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-green-600 hover:shadow-md focus-visible:border-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 md:p-6"
      aria-label={`Open ${deck.name} deck with ${deck.card_count} cards`}
    >
      {/* Deck Name */}
      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-green-600">{deck.name}</h3>

      {/* Card Count Badge */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-slate-600">
          {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
        </span>
      </div>

      {/* Optional: Last updated timestamp */}
      {deck.updated_at && (
        <div className="mt-1 text-xs text-slate-400">
          Updated {new Date(deck.updated_at).toLocaleDateString(locale)}
        </div>
      )}
    </div>
  );
}
