/**
 * CardFormDrawer - Modal drawer for editing flashcard content
 * Supports both create and edit modes
 * Slides up from bottom on mobile, appears as centered modal on desktop
 */

import { useState, useEffect, useRef } from "react";

interface CardFormDrawerProps {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: {
    front: string;
    back: string;
  };
  isSaving?: boolean;
  saveError?: string | null;
  onSave: (front: string, back: string) => void;
  onCancel: () => void;
}

interface CardFormState {
  front: string;
  back: string;
  errors: {
    front?: string;
    back?: string;
  };
}

const MAX_FRONT_LENGTH = 200;
const MAX_BACK_LENGTH = 500;

export default function CardFormDrawer({
  isOpen,
  mode,
  initialData,
  isSaving = false,
  saveError = null,
  onSave,
  onCancel,
}: CardFormDrawerProps) {
  const [formState, setFormState] = useState<CardFormState>({
    front: initialData?.front || "",
    back: initialData?.back || "",
    errors: {},
  });

  const frontInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Update form state when initialData changes
  useEffect(() => {
    if (isOpen && initialData) {
      setFormState({
        front: initialData.front,
        back: initialData.back,
        errors: {},
      });
    }
  }, [isOpen, initialData]);

  // Focus on front input when opened
  useEffect(() => {
    if (isOpen && frontInputRef.current) {
      // Delay focus to allow animation to start
      setTimeout(() => {
        frontInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const validateForm = (): boolean => {
    const errors: CardFormState["errors"] = {};

    if (formState.front.trim().length === 0) {
      errors.front = "Front is required";
    } else if (formState.front.length > MAX_FRONT_LENGTH) {
      errors.front = `Maximum ${MAX_FRONT_LENGTH} characters`;
    }

    if (formState.back.trim().length === 0) {
      errors.back = "Back is required";
    } else if (formState.back.length > MAX_BACK_LENGTH) {
      errors.back = `Maximum ${MAX_BACK_LENGTH} characters`;
    }

    setFormState((prev) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSave(formState.front.trim(), formState.back.trim());
      // Reset form
      setFormState({
        front: "",
        back: "",
        errors: {},
      });
    }
  };

  const handleCancel = () => {
    setFormState({
      front: "",
      back: "",
      errors: {},
    });
    onCancel();
  };

  // Check if form is valid for Save button
  const isFormValid =
    formState.front.trim().length > 0 &&
    formState.front.length <= MAX_FRONT_LENGTH &&
    formState.back.trim().length > 0 &&
    formState.back.length <= MAX_BACK_LENGTH;

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Drawer/Modal */}
      <div
        ref={drawerRef}
        className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div
          className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-h-[85vh] md:max-h-[90vh] w-full md:max-w-2xl
            flex flex-col animate-slide-up md:animate-fade-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <h2 id="drawer-title" className="text-xl font-bold text-neutral-900">
              {mode === "edit" ? "Edit Flashcard" : "Create Flashcard"}
            </h2>
            <button
              onClick={handleCancel}
              className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100
                transition-colors duration-200 cursor-pointer"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Error message */}
            {saveError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{saveError}</div>
            )}

            {/* Front Input */}
            <div className="space-y-2">
              <label htmlFor="card-front" className="block text-sm font-medium text-neutral-700">
                Front (Question)
              </label>
              <input
                ref={frontInputRef}
                id="card-front"
                type="text"
                value={formState.front}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    front: e.target.value,
                    errors: { ...prev.errors, front: undefined },
                  }))
                }
                placeholder="Enter question..."
                maxLength={MAX_FRONT_LENGTH}
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  formState.errors.front ? "border-red-500" : "border-neutral-300"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200`}
              />
              <div className="flex items-center justify-between text-xs">
                {formState.errors.front ? (
                  <span className="text-red-600 font-medium">{formState.errors.front}</span>
                ) : (
                  <span className="text-neutral-500">Enter the question or prompt</span>
                )}
                <span
                  className={`font-mono ${formState.front.length > MAX_FRONT_LENGTH ? "text-red-600" : "text-neutral-600"}`}
                >
                  {formState.front.length}/{MAX_FRONT_LENGTH}
                </span>
              </div>
            </div>

            {/* Back Textarea */}
            <div className="space-y-2">
              <label htmlFor="card-back" className="block text-sm font-medium text-neutral-700">
                Back (Answer)
              </label>
              <textarea
                id="card-back"
                value={formState.back}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    back: e.target.value,
                    errors: { ...prev.errors, back: undefined },
                  }))
                }
                placeholder="Enter answer..."
                rows={6}
                maxLength={MAX_BACK_LENGTH}
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  formState.errors.back ? "border-red-500" : "border-neutral-300"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 resize-none transition-colors duration-200`}
              />
              <div className="flex items-center justify-between text-xs">
                {formState.errors.back ? (
                  <span className="text-red-600 font-medium">{formState.errors.back}</span>
                ) : (
                  <span className="text-neutral-500">Enter the answer or explanation</span>
                )}
                <span
                  className={`font-mono ${formState.back.length > MAX_BACK_LENGTH ? "text-red-600" : "text-neutral-600"}`}
                >
                  {formState.back.length}/{MAX_BACK_LENGTH}
                </span>
              </div>
            </div>
          </form>

          {/* Footer */}
          <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg
                hover:bg-neutral-50 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-2
                focus:ring-neutral-500 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={!isFormValid || isSaving}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg
                hover:bg-green-700 disabled:bg-neutral-300 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                transition-colors duration-200 cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
