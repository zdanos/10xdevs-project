/**
 * EmptyState - Empty state component for deck with no flashcards
 *
 * Displays a friendly message encouraging users to create their first flashcard.
 * Includes a CTA button to open the card form.
 */

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreate: () => void;
}

export function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
          <FileText className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No flashcards yet</h3>
        <p className="mt-2 text-sm text-gray-600">Add your first flashcard to start learning</p>
        <Button onClick={onCreate} className="mt-6 bg-green-600 hover:bg-green-700">
          Create Flashcard
        </Button>
      </div>
    </div>
  );
}
