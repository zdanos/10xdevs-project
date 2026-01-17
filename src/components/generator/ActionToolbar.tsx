/**
 * ActionToolbar - Fixed toolbar with main action buttons
 * Contains Generate and Save to Deck buttons
 */

interface ActionToolbarProps {
  canGenerate: boolean;
  canSave: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  acceptedCount: number;
  onGenerate: () => void;
  onSave: () => void;
}

export default function ActionToolbar({
  canGenerate,
  canSave,
  isGenerating,
  isSaving,
  acceptedCount,
  onGenerate,
  onSave,
}: ActionToolbarProps) {
  return (
    <section className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-lg md:static md:border-0 md:shadow-none md:bg-transparent z-30">
      <div className="px-4 pt-4 pb-2 md:max-w-7xl md:mx-auto md:px-4 md:pt-0 md:pb-0">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Generate Button */}
          <button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-base font-semibold
              text-white bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none
              group relative"
            aria-label="Generate flashcards with AI"
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
                <span>Generate Flashcards</span>
              </>
            )}

            {/* Tooltip for disabled state */}
            {!canGenerate && !isGenerating && (
              <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-normal text-white bg-neutral-900 rounded-lg whitespace-nowrap z-10">
                {acceptedCount > 0
                  ? "Please paste valid text (500-5000 characters)"
                  : "Enter at least 500 characters to generate"}
                <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900" />
              </span>
            )}
          </button>

          {/* Save to Deck Button - Only show if there are cards */}
          {acceptedCount > 0 && (
            <button
              onClick={onSave}
              disabled={!canSave || isSaving}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-base font-semibold
                text-white bg-green-600 hover:bg-green-700 disabled:bg-neutral-300 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none"
              aria-label={`Save ${acceptedCount} flashcard${acceptedCount !== 1 ? "s" : ""} to deck`}
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                  </svg>
                  <span>Save to Deck ({acceptedCount})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Safe area padding for mobile devices */}
      <div className="pb-safe md:hidden" />
    </section>
  );
}
