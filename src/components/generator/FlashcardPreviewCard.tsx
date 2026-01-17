/**
 * FlashcardPreviewCard - Individual flashcard preview in staging area
 * Displays front/back content with action buttons for edit, accept, and reject
 */

import { useState } from "react";
import type { StagingFlashcard } from "@/types";

interface FlashcardPreviewCardProps {
  card: StagingFlashcard;
  onEdit: () => void;
  onAccept: () => void;
  onReject: () => void;
}

export default function FlashcardPreviewCard({ card, onEdit, onAccept, onReject }: FlashcardPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if content is long enough to need expansion
  const frontNeedsExpansion = card.front.length > 200;
  const backNeedsExpansion = card.back.length > 300;

  // Determine card styling based on status
  const getCardStyles = () => {
    switch (card.status) {
      case "accepted":
        return {
          border: "border-green-500",
          bg: "bg-green-50",
          badge: { text: "Accepted", color: "bg-green-500 text-white" },
        };
      case "edited":
        return {
          border: "border-blue-500",
          bg: "bg-blue-50",
          badge: { text: "Edited", color: "bg-blue-500 text-white" },
        };
      default:
        return {
          border: "border-neutral-300",
          bg: "bg-white",
          badge: null,
        };
    }
  };

  const styles = getCardStyles();

  return (
    <div
      className={`relative rounded-lg border-2 ${styles.border} ${styles.bg} shadow-sm hover:shadow-md transition-all duration-200`}
    >
      {/* Status Badge */}
      {styles.badge && (
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${styles.badge.color}`}
          >
            {card.status === "accepted" && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {styles.badge.text}
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Front Preview */}
        <div className="pr-20">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Front</div>
          <p
            className={`text-sm text-neutral-900 whitespace-pre-wrap break-words ${
              !isExpanded && frontNeedsExpansion ? "line-clamp-3" : ""
            }`}
          >
            {card.front}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-200" />

        {/* Back Preview */}
        <div>
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Back</div>
          <div
            className={`text-sm text-neutral-900 whitespace-pre-wrap break-words ${!isExpanded && backNeedsExpansion ? "max-h-32 overflow-y-auto" : ""}`}
          >
            {card.back}
          </div>
        </div>

        {/* Expand/Collapse Button - Show if either front or back needs expansion */}
        {(frontNeedsExpansion || backNeedsExpansion) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 pt-2 transition-colors duration-200"
            aria-label={isExpanded ? "Show less" : "Show more"}
          >
            {isExpanded ? (
              <>
                <span>Show less</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            ) : (
              <>
                <span>Show more</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 flex items-center gap-2">
        {/* Edit Button */}
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium
            text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            transition-colors duration-200"
          aria-label="Edit flashcard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          Edit
        </button>

        {/* Accept Button */}
        <button
          onClick={onAccept}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
            transition-colors duration-200
            ${
              card.status === "accepted" || card.status === "edited"
                ? "text-white bg-green-600 border border-green-600 hover:bg-green-700"
                : "text-green-700 bg-white border border-green-300 hover:bg-green-50 hover:border-green-400"
            }`}
          aria-label="Accept flashcard"
          aria-pressed={card.status === "accepted" || card.status === "edited"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {card.status === "accepted" || card.status === "edited" ? "Accepted" : "Accept"}
        </button>

        {/* Reject Button */}
        <button
          onClick={onReject}
          className="inline-flex items-center justify-center p-2 rounded-md text-sm font-medium
            text-red-700 bg-white border border-red-300 hover:bg-red-50 hover:border-red-400
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
            transition-colors duration-200"
          aria-label="Reject flashcard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
