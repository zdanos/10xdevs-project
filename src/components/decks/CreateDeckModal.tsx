/**
 * CreateDeckModal - Modal dialog for creating new decks
 *
 * Features:
 * - Form with deck name input
 * - Real-time validation using Zod schema
 * - Character counter (max 100 chars)
 * - Error message display
 * - Loading state during submission
 * - Focus trap and escape key handling
 * - Auto-focus input on open
 *
 * Validation Rules:
 * - Required field (not empty after trim)
 * - Minimum 1 character after trim
 * - Maximum 100 characters
 * - Cannot be only whitespace
 */

import { useState, useEffect, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createDeckSchema } from "@/lib/validators/deck.validator";
import type { CreateDeckCommand } from "@/types";

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (command: CreateDeckCommand) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export default function CreateDeckModal({ isOpen, onClose, onSubmit, isSubmitting, error }: CreateDeckModalProps) {
  const [name, setName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const inputId = useId();

  const maxLength = 100;
  const remainingChars = maxLength - name.length;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setValidationError(null);
      setTouched(false);
    }
  }, [isOpen]);

  // Validate on input change (only if touched)
  useEffect(() => {
    if (!touched) return;

    const result = createDeckSchema.safeParse({ name });
    if (result.success) {
      setValidationError(null);
    } else {
      const firstError = result.error.errors[0];
      setValidationError(firstError.message);
    }
  }, [name, touched]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (!touched) setTouched(true);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    // Validate before submit
    const result = createDeckSchema.safeParse({ name });
    if (!result.success) {
      const firstError = result.error.errors[0];
      setValidationError(firstError.message);
      return;
    }

    // Submit
    await onSubmit({ name: name.trim() });
  };

  const handleCancel = () => {
    onClose();
  };

  const isValid = validationError === null && name.trim().length > 0;
  const showError = touched && (validationError || error);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="create-deck-modal">
        <DialogHeader>
          <DialogTitle>Create New Deck</DialogTitle>
          <DialogDescription>Give your new deck a name. You can change it later.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} data-testid="create-deck-form">
          <div className="space-y-4 py-4">
            {/* Deck Name Input */}
            <div className="space-y-2">
              <label htmlFor={inputId} className="text-sm font-medium text-slate-900">
                Deck Name <span className="text-red-600">*</span>
              </label>

              <Input
                id={inputId}
                type="text"
                value={name}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="e.g., Spanish Vocabulary"
                maxLength={maxLength}
                disabled={isSubmitting}
                className={showError ? "border-red-500 focus-visible:ring-red-500" : ""}
                aria-invalid={showError ? "true" : "false"}
                aria-describedby={showError ? `${inputId}-error` : undefined}
                data-testid="create-deck-name-input"
              />

              {/* Character Counter */}
              <div className="flex items-center justify-between text-xs">
                <span className={remainingChars < 10 ? "text-orange-600 font-medium" : "text-slate-500"}>
                  {remainingChars} characters remaining
                </span>
              </div>

              {/* Validation Error */}
              {showError && (
                <p id={`${inputId}-error`} className="text-sm text-red-600" role="alert">
                  {validationError || error}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              data-testid="create-deck-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="bg-green-600 hover:bg-green-700"
              data-testid="create-deck-submit-button"
            >
              {isSubmitting ? "Creating..." : "Create Deck"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
