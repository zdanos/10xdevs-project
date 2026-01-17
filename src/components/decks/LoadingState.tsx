/**
 * LoadingState - Skeleton loader for deck library
 *
 * Displays skeleton cards that match the layout of DeckGrid
 * to provide visual feedback during data loading.
 *
 * Features:
 * - Responsive grid matching DeckGrid breakpoints
 * - Pulsing animation for perceived performance
 * - 6 skeleton cards by default
 * - Accessible loading announcement
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingState() {
  // Generate array of skeleton cards (6 cards shown)
  const skeletonCount = 6;

  return (
    <div role="status" aria-label="Loading decks">
      {/* Screen reader announcement */}
      <span className="sr-only">Loading decks...</span>

      {/* Skeleton Grid - matches DeckGrid layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-6"
            aria-hidden="true"
          >
            {/* Deck name skeleton */}
            <Skeleton className="h-6 w-3/4" />

            {/* Card count skeleton */}
            <div className="mt-2">
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Updated date skeleton */}
            <div className="mt-1">
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
