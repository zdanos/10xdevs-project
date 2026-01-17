/**
 * QuotaIndicator - Displays user's remaining daily generation quota
 * Shows as a progress bar with numerical indicator
 */

interface QuotaIndicatorProps {
  remaining: number; // Number of generations remaining (0-10)
  max: number; // Maximum generations allowed (10)
}

export default function QuotaIndicator({ remaining, max }: QuotaIndicatorProps) {
  // Calculate percentage for progress bar
  const percentage = (remaining / max) * 100;

  // Determine color based on remaining count
  const getColorClasses = () => {
    if (remaining === 0) {
      return {
        bar: "bg-red-500",
        text: "text-red-700",
        bg: "bg-red-100",
      };
    } else if (remaining <= 3) {
      return {
        bar: "bg-orange-500",
        text: "text-orange-700",
        bg: "bg-orange-100",
      };
    } else if (remaining <= 6) {
      return {
        bar: "bg-yellow-500",
        text: "text-yellow-700",
        bg: "bg-yellow-100",
      };
    } else {
      return {
        bar: "bg-green-500",
        text: "text-green-700",
        bg: "bg-green-100",
      };
    }
  };

  const colors = getColorClasses();

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700">Generations Left</span>
          <span className={`text-sm font-semibold ${colors.text}`}>
            {remaining}/{max}
          </span>
        </div>

        <div className={`h-2 rounded-full ${colors.bg} overflow-hidden`}>
          <div
            className={`h-full ${colors.bar} transition-all duration-300 ease-in-out`}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={remaining}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={`${remaining} of ${max} generations remaining`}
          />
        </div>
      </div>

      {remaining === 0 && (
        <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>Limit reached</span>
        </div>
      )}
    </div>
  );
}
