/**
 * SearchFilter - Search input component for filtering decks
 *
 * Provides real-time client-side filtering of decks by name.
 *
 * Features:
 * - Search icon (leading)
 * - Clear button (trailing, conditional)
 * - Debounced input for performance
 * - Accessibility attributes
 * - Responsive sizing
 */

import { useDeferredValue, useId } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface SearchFilterProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

export default function SearchFilter({ value, onChange, placeholder = "Search decks..." }: SearchFilterProps) {
  const inputId = useId();
  // Use deferred value for performance optimization
  const deferredValue = useDeferredValue(value);

  const handleClear = () => {
    onChange("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative w-full" role="search">
      {/* Search Icon */}
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>

      {/* Search Input */}
      <Input
        id={inputId}
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-ms-clear]:hidden"
        aria-label="Search decks by name"
      />

      {/* Clear Button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Screen reader announcement for search results */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {deferredValue ? `Searching for: ${deferredValue}` : "Search cleared"}
      </div>
    </div>
  );
}
