/**
 * DeleteConfirmationDialog - Reusable confirmation dialog for destructive actions
 *
 * Provides two-step confirmation for deck and flashcard deletion.
 * Shows contextual warning messages based on deletion type.
 *
 * Features:
 * - Deck deletion: Shows card count warning
 * - Flashcard deletion: Shows card preview
 * - Danger styling with red action button
 * - Loading state during deletion
 * - Clear warning messages
 */

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  type: "deck" | "flashcard";
  itemName: string;
  itemCount?: number; // For deck: number of cards to be deleted
  isDeleting: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  isOpen,
  type,
  itemName,
  itemCount,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  // Prepare content based on type
  const title = type === "deck" ? "Delete Deck?" : "Delete Flashcard?";

  const getMessage = () => {
    if (type === "deck") {
      return (
        <>
          Are you sure you want to delete <strong className="font-semibold">&apos;{itemName}&apos;</strong>?{" "}
          {itemCount !== undefined && itemCount > 0 && (
            <>
              This will permanently delete <strong className="font-semibold">{itemCount}</strong>{" "}
              {itemCount === 1 ? "flashcard" : "flashcards"}.
            </>
          )}{" "}
          This action cannot be undone.
        </>
      );
    } else {
      return (
        <>
          Are you sure you want to delete this flashcard? This action cannot be undone.
          {itemName && (
            <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-sm text-gray-600 line-clamp-2">{itemName}</p>
            </div>
          )}
        </>
      );
    }
  };

  const buttonText = type === "deck" ? "Delete Deck" : "Delete Flashcard";

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-700">{getMessage()}</p>

          {/* Error message */}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
