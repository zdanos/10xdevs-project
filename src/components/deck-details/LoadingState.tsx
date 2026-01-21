/**
 * LoadingState - Skeleton loader for flashcard list
 *
 * Displays skeleton cards during flashcard fetching.
 * Provides visual feedback and reduces perceived loading time.
 */

import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {/* Front section skeleton */}
          <div className="mb-3">
            <Skeleton className="mb-2 h-3 w-12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-3/4" />
          </div>

          {/* Back section skeleton */}
          <div className="mb-3">
            <Skeleton className="mb-2 h-3 w-12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-4/5" />
          </div>

          {/* Action buttons skeleton */}
          <div className="flex items-center gap-2 border-t pt-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
