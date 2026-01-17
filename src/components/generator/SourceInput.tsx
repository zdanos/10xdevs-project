/**
 * SourceInput - Text input area for source material
 * Includes character counter and validation feedback
 */

import { useMemo } from "react";
import type { ValidationState } from "@/types";

interface SourceInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const MIN_CHARS = 500;
const MAX_CHARS = 5000;

export default function SourceInput({ value, onChange, disabled = false }: SourceInputProps) {
  // Calculate validation state
  const validation: ValidationState = useMemo(() => {
    const length = value.length;

    if (length === 0) {
      return {
        isValid: false,
        message: "",
        type: "info",
      };
    }

    if (length > MAX_CHARS) {
      return {
        isValid: false,
        message: `Maximum ${MAX_CHARS} characters exceeded`,
        type: "error",
      };
    }

    if (length < MIN_CHARS) {
      return {
        isValid: false,
        message: `Minimum ${MIN_CHARS} characters required`,
        type: "warning",
      };
    }

    return {
      isValid: true,
      message: "Ready to generate",
      type: "success",
    };
  }, [value]);

  // Determine border color based on validation
  const getBorderColor = () => {
    if (disabled) return "border-neutral-300";
    if (value.length === 0) return "border-neutral-300 focus:border-blue-500";

    switch (validation.type) {
      case "error":
        return "border-red-500 focus:border-red-600";
      case "warning":
        return "border-yellow-500 focus:border-yellow-600";
      case "success":
        return "border-green-500 focus:border-green-600";
      default:
        return "border-neutral-300 focus:border-blue-500";
    }
  };

  // Get icon based on validation type
  const getIcon = () => {
    if (value.length === 0) return null;

    switch (validation.type) {
      case "error":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "warning":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-yellow-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "success":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  // Get text color for validation message
  const getMessageColor = () => {
    switch (validation.type) {
      case "error":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      case "success":
        return "text-green-600";
      default:
        return "text-neutral-600";
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <label htmlFor="source-text" className="text-sm font-medium text-neutral-700">
        Source Text
      </label>

      <div className="relative">
        <textarea
          id="source-text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Paste your notes here (minimum 500 characters)..."
          className={`w-full min-h-[200px] max-h-[400px] p-4 pr-12 rounded-lg border-2 ${getBorderColor()} 
            bg-white text-neutral-900 placeholder:text-neutral-400
            focus:outline-none focus:ring-2 focus:ring-offset-2 
            ${validation.type === "error" ? "focus:ring-red-500" : ""}
            ${validation.type === "warning" ? "focus:ring-yellow-500" : ""}
            ${validation.type === "success" ? "focus:ring-green-500" : "focus:ring-blue-500"}
            disabled:bg-neutral-100 disabled:cursor-not-allowed
            resize-y transition-colors duration-200`}
        />

        {getIcon() && <div className="absolute top-4 right-4">{getIcon()}</div>}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {validation.message && <span className={`${getMessageColor()} font-medium`}>{validation.message}</span>}
        </div>

        <span className={`font-mono ${value.length > MAX_CHARS ? "text-red-600 font-semibold" : "text-neutral-600"}`}>
          {value.length}/{MAX_CHARS}
        </span>
      </div>
    </section>
  );
}
