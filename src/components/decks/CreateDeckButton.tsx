/**
 * CreateDeckButton - Primary action button for deck creation
 *
 * Styled as:
 * - Floating Action Button (FAB) on mobile - fixed bottom-right
 * - Standard button in header on desktop - inline
 *
 * Features:
 * - Responsive positioning
 * - Green primary color
 * - Plus icon
 * - Disabled state support
 * - Accessible labeling
 */

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface CreateDeckButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function CreateDeckButton({ onClick, disabled = false }: CreateDeckButtonProps) {
  return (
    <>
      {/* Mobile FAB - Fixed bottom-right */}
      <Button
        onClick={onClick}
        disabled={disabled}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-green-600 p-0 shadow-lg hover:bg-green-700 md:hidden"
        aria-label="Create new deck"
        data-testid="create-deck-button-mobile"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Desktop button - Inline */}
      <Button
        onClick={onClick}
        disabled={disabled}
        className="hidden bg-green-600 hover:bg-green-700 md:inline-flex"
        size="default"
        data-testid="create-deck-button-desktop"
      >
        <Plus className="mr-2 h-5 w-5" />
        New Deck
      </Button>
    </>
  );
}
