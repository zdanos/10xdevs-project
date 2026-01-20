/**
 * EmptyState - Display when user has no decks
 *
 * Provides a friendly, welcoming interface encouraging the user
 * to create their first deck.
 *
 * Features:
 * - Empty state illustration/icon
 * - Clear call-to-action
 * - Responsive layout
 * - Accessible labeling
 */

import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";

interface EmptyStateProps {
  onCreateClick: () => void;
}

export default function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center" role="status" aria-label="No decks available">
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <FolderPlus className="h-10 w-10 text-slate-400" aria-hidden="true" />
        </div>

        {/* Heading */}
        <h2 className="mt-6 text-2xl font-semibold text-slate-900">No Decks Yet</h2>

        {/* Description */}
        <p className="mt-2 text-base text-slate-600">Create your first deck to start learning</p>

        {/* CTA Button */}
        <Button
          onClick={onCreateClick}
          className="mt-6 bg-green-600 hover:bg-green-700"
          size="lg"
          data-testid="create-first-deck-button"
        >
          <FolderPlus className="mr-2 h-5 w-5" />
          Create Your First Deck
        </Button>
      </div>
    </div>
  );
}
