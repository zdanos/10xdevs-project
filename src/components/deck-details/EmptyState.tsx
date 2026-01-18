/**
 * EmptyState - Empty state component for deck with no flashcards
 *
 * Displays a friendly message encouraging users to create their first flashcard.
 * Includes CTA buttons for manual creation and AI generation.
 */

import { FileText, Sparkles, Plus } from "lucide-react";
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
        
        {/* Action buttons */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => (window.location.href = "/app/generate")}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate with AI</span>
          </Button>
          <Button onClick={onCreate} variant="outline" className="flex items-center gap-2 border-gray-300">
            <Plus className="h-4 w-4" />
            <span>Create Manually</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
