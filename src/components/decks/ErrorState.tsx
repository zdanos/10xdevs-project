/**
 * ErrorState - Display when deck loading fails
 *
 * Provides clear error messaging and recovery action.
 *
 * Features:
 * - Error icon with clear visual feedback
 * - User-friendly error message
 * - Retry button for recovery
 * - Responsive layout
 * - Accessible error announcement
 */

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { ApiError } from "@/types";

interface ErrorStateProps {
  error: ApiError | null;
  onRetry: () => void;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  const errorMessage = error?.message || "Failed to load decks";

  return (
    <div className="flex min-h-[400px] items-center justify-center" role="alert" aria-live="assertive">
      <div className="text-center">
        {/* Error Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-10 w-10 text-red-600" aria-hidden="true" />
        </div>

        {/* Error Heading */}
        <h2 className="mt-6 text-2xl font-semibold text-slate-900">Failed to Load Decks</h2>

        {/* Error Message */}
        <p className="mt-2 max-w-md text-base text-slate-600">{errorMessage}</p>

        {/* Retry Button */}
        <Button onClick={onRetry} variant="outline" className="mt-6" size="lg">
          <RefreshCw className="mr-2 h-5 w-5" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
