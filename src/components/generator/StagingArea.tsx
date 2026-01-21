/**
 * StagingArea - Container for displaying generated flashcards in staging state
 * Cards can be edited, accepted, or rejected before final save
 */

import { useMemo } from "react";
import FlashcardPreviewCard from "./FlashcardPreviewCard";
import type { StagingFlashcard } from "@/types";

interface StagingAreaProps {
  cards: StagingFlashcard[];
  isLoading: boolean;
  onEditCard: (cardId: string) => void;
  onAcceptCard: (cardId: string) => void;
  onRejectCard: (cardId: string) => void;
}

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border-2 border-neutral-200 bg-white shadow-sm animate-pulse">
          <div className="p-4 space-y-3">
            <div>
              <div className="h-3 w-12 bg-neutral-200 rounded mb-2" />
              <div className="h-4 bg-neutral-200 rounded w-3/4" />
              <div className="h-4 bg-neutral-200 rounded w-1/2 mt-1" />
            </div>
            <div className="border-t border-neutral-200" />
            <div>
              <div className="h-3 w-12 bg-neutral-200 rounded mb-2" />
              <div className="h-4 bg-neutral-200 rounded w-full" />
              <div className="h-4 bg-neutral-200 rounded w-5/6 mt-1" />
              <div className="h-4 bg-neutral-200 rounded w-2/3 mt-1" />
            </div>
          </div>
          <div className="px-4 pb-4 flex items-center gap-2">
            <div className="flex-1 h-9 bg-neutral-200 rounded" />
            <div className="flex-1 h-9 bg-neutral-200 rounded" />
            <div className="h-9 w-9 bg-neutral-200 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 mb-6 text-neutral-300">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Flashcards Yet</h3>
      <p className="text-neutral-600 max-w-sm">
        Paste your notes above and click &quot;Generate Flashcards&quot; to see AI-generated cards here.
      </p>
    </div>
  );
}

export default function StagingArea({ cards, isLoading, onEditCard, onAcceptCard, onRejectCard }: StagingAreaProps) {
  // Calculate counts
  const counts = useMemo(() => {
    const accepted = cards.filter((c) => c.status === "accepted" || c.status === "edited").length;
    const rejected = 0; // Rejected cards are already filtered out
    return { accepted, rejected, total: cards.length };
  }, [cards]);

  // Show loading skeleton
  if (isLoading) {
    return (
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Generated Flashcards</h2>
            <p className="text-sm text-neutral-600 mt-1">Generating cards with AI...</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <LoadingSkeleton />
        </div>
      </section>
    );
  }

  // Show empty state
  if (cards.length === 0) {
    return (
      <section className="bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-300">
        <EmptyState />
      </section>
    );
  }

  // Show cards
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Generated Flashcards</h2>
          <p className="text-sm text-neutral-600 mt-1">Review and edit cards before saving to a deck</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-neutral-900">{counts.total}</div>
          <div className="text-xs text-neutral-600">Cards</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <FlashcardPreviewCard
            key={card.id}
            card={card}
            onEdit={() => onEditCard(card.id)}
            onAccept={() => onAcceptCard(card.id)}
            onReject={() => onRejectCard(card.id)}
          />
        ))}
      </div>

      <footer className="flex items-center justify-between pt-4 border-t border-neutral-200">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-neutral-700">
              <span className="font-semibold">{counts.accepted}</span> Accepted
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neutral-300" />
            <span className="text-neutral-700">
              <span className="font-semibold">{counts.total - counts.accepted}</span> Pending
            </span>
          </div>
        </div>

        {counts.accepted > 0 && (
          <div className="text-sm text-neutral-600">
            {counts.accepted} card{counts.accepted !== 1 ? "s" : ""} ready to save
          </div>
        )}
      </footer>
    </section>
  );
}
