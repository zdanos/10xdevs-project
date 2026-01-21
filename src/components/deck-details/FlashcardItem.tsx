/**
 * FlashcardItem - Individual flashcard display component
 *
 * Shows front/back content with action buttons.
 * Provides visual hierarchy with truncated text.
 *
 * Features:
 * - Front and back content sections
 * - Text truncation with line clamps
 * - Edit and delete action buttons
 * - Keyboard navigation support
 * - Semantic HTML with accessibility
 */

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlashcardDTO } from "@/types";

interface FlashcardItemProps {
  flashcard: FlashcardDTO;
  onEdit: () => void;
  onDelete: () => void;
}

export function FlashcardItem({ flashcard, onEdit, onDelete }: FlashcardItemProps) {
  return (
    <article className="group relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Front content */}
      <div className="mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Front</span>
        <p className="mt-1 line-clamp-3 text-sm text-gray-900">{flashcard.front}</p>
      </div>

      {/* Back content */}
      <div className="mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Back</span>
        <p className="mt-1 line-clamp-3 text-sm text-gray-700">{flashcard.back}</p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="flex items-center gap-1.5"
          aria-label={`Edit flashcard: ${flashcard.front.substring(0, 50)}`}
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="text-xs">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
          aria-label={`Delete flashcard: ${flashcard.front.substring(0, 50)}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="text-xs">Delete</span>
        </Button>
      </div>
    </article>
  );
}
