/**
 * AddCardButton - Context-aware button for creating flashcards
 *
 * Renders as a Floating Action Button (FAB) on mobile devices
 * and a standard button on desktop.
 *
 * Features:
 * - Responsive rendering (FAB < 768px, button >= 768px)
 * - Large touch target for mobile (56x56px)
 * - Accessible labeling
 * - Disabled state support
 * - Smooth animations
 */

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddCardButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function AddCardButton({ onClick, disabled = false }: AddCardButtonProps) {
  return (
    <>
      {/* Mobile FAB - Fixed positioning, circular */}
      <Button
        onClick={onClick}
        disabled={disabled}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-green-600 shadow-lg transition-transform hover:scale-105 hover:bg-green-700 active:scale-95 disabled:bg-gray-300 md:hidden"
        size="icon"
        aria-label="Add flashcard"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Desktop Button - Inline, standard appearance */}
      <Button
        onClick={onClick}
        disabled={disabled}
        className="hidden items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 md:flex"
        aria-label="Add flashcard"
      >
        <Plus className="h-4 w-4" />
        <span>Add Flashcard</span>
      </Button>
    </>
  );
}
