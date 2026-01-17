/**
 * NoResultsState - Display when search query returns no results
 *
 * Helps users understand why they see no decks and provides
 * an easy action to clear the search.
 *
 * Features:
 * - Search icon for context
 * - Displays the search query
 * - Clear search button
 * - Responsive layout
 * - Accessible status announcement
 */

import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

interface NoResultsStateProps {
  searchQuery: string;
  onClearSearch: () => void;
}

export default function NoResultsState({ searchQuery, onClearSearch }: NoResultsStateProps) {
  return (
    <div className="flex min-h-[300px] items-center justify-center" role="status" aria-live="polite">
      <div className="text-center">
        {/* Search Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <SearchX className="h-8 w-8 text-slate-400" aria-hidden="true" />
        </div>

        {/* Heading */}
        <h2 className="mt-4 text-xl font-semibold text-slate-900">No Decks Found</h2>

        {/* Description with search query */}
        <p className="mt-2 text-base text-slate-600">
          No decks match <span className="font-medium">"{searchQuery}"</span>
        </p>

        {/* Clear Search Button */}
        <Button onClick={onClearSearch} variant="outline" className="mt-4">
          Clear Search
        </Button>
      </div>
    </div>
  );
}
