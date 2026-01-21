/**
 * DeckHeader - Header component for Deck Details view
 *
 * Displays deck title, card count, and action buttons.
 * Provides access to rename/delete deck operations and study mode navigation.
 * Implements optimistic UI updates for renaming.
 *
 * Features:
 * - Deck title with inline edit option
 * - Card count display
 * - "Study Now" primary CTA button
 * - Actions dropdown menu (Rename, Delete)
 * - Rename dialog with validation
 */

import { useState } from "react";
import { Pencil, MoreVertical, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { DeckDTO } from "@/types";

interface DeckHeaderProps {
  deck: DeckDTO;
  isRenaming: boolean;
  isDeletingDeck: boolean;
  onRename: (name: string) => Promise<void>;
  onDelete: () => void;
  onStudy: () => void;
}

export function DeckHeader({ deck, isRenaming, isDeletingDeck, onRename, onDelete, onStudy }: DeckHeaderProps) {
  // Rename dialog state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState(deck.name);
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Validates the deck name
   * Returns error message or null if valid
   */
  const validateName = (name: string): string | null => {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      return "Deck name is required";
    }

    if (trimmed.length > 100) {
      return "Maximum 100 characters";
    }

    return null;
  };

  /**
   * Handles name input change with real-time validation
   */
  const handleNameChange = (value: string) => {
    setNewName(value);
    setValidationError(validateName(value));
  };

  /**
   * Opens rename dialog and resets state
   */
  const openRenameDialog = () => {
    setNewName(deck.name);
    setValidationError(null);
    setShowRenameDialog(true);
  };

  /**
   * Closes rename dialog
   */
  const closeRenameDialog = () => {
    setShowRenameDialog(false);
    setNewName(deck.name);
    setValidationError(null);
  };

  /**
   * Handles rename submission
   */
  const handleRenameSubmit = async () => {
    const error = validateName(newName);
    if (error) {
      setValidationError(error);
      return;
    }

    const trimmed = newName.trim();

    // No-op if name hasn't changed
    if (trimmed === deck.name) {
      closeRenameDialog();
      return;
    }

    await onRename(trimmed);
    closeRenameDialog();
  };

  /**
   * Check if submit button should be disabled
   */
  const isSubmitDisabled = () => {
    return isRenaming || validationError !== null || newName.trim().length === 0;
  };

  return (
    <header className="mb-6 border-b pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left side: Title and card count */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">{deck.name}</h1>
            <Button variant="ghost" size="sm" onClick={openRenameDialog} aria-label="Rename deck">
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
          </p>
        </div>

        {/* Right side: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Study Now button */}
          <Button
            onClick={onStudy}
            disabled={deck.card_count === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
            title={deck.card_count === 0 ? "Add flashcards before studying" : undefined}
          >
            <BookOpen className="h-4 w-4" />
            <span>Study Now</span>
          </Button>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openRenameDialog} className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                <span>Rename Deck</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                disabled={isDeletingDeck}
                className="flex items-center gap-2 text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Deck</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Deck</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="deck-name" className="mb-2 block text-sm font-medium text-gray-700">
              Deck Name
            </label>
            <Input
              id="deck-name"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter deck name"
              maxLength={100}
              className={validationError ? "border-red-500" : ""}
              disabled={isRenaming}
            />
            {/* Character counter */}
            <div className="mt-1 flex items-center justify-between">
              <div>{validationError && <p className="text-sm text-red-600">{validationError}</p>}</div>
              <p className={`text-sm ${newName.length > 100 ? "text-red-600" : "text-gray-500"}`}>
                {newName.length}/100
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRenameDialog} disabled={isRenaming}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={isSubmitDisabled()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
            >
              {isRenaming ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
