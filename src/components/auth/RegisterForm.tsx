/**
 * RegisterForm - Client-side registration form component
 * Handles email/password/confirmPassword input with validation and error display
 */

import { useState, useCallback, useId } from "react";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth.validator";
import { Button } from "@/components/ui/button";

interface RegisterFormProps {
  onSubmit: (data: RegisterInput) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  fieldErrors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}

export default function RegisterForm({ onSubmit, isSubmitting = false, error = null }: RegisterFormProps) {
  const [formState, setFormState] = useState<FormState>({
    email: "",
    password: "",
    confirmPassword: "",
    fieldErrors: {},
  });

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const validateForm = useCallback((): boolean => {
    const result = registerSchema.safeParse({
      email: formState.email,
      password: formState.password,
      confirmPassword: formState.confirmPassword,
    });

    if (!result.success) {
      const fieldErrors: FormState["fieldErrors"] = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormState["fieldErrors"];
        fieldErrors[field] = err.message;
      });
      setFormState((prev) => ({ ...prev, fieldErrors }));
      return false;
    }

    setFormState((prev) => ({ ...prev, fieldErrors: {} }));
    return true;
  }, [formState.email, formState.password, formState.confirmPassword]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      await onSubmit({
        email: formState.email.trim(),
        password: formState.password,
        confirmPassword: formState.confirmPassword,
      });
    },
    [validateForm, onSubmit, formState.email, formState.password, formState.confirmPassword]
  );

  const updateField = useCallback(
    (field: keyof Pick<FormState, "email" | "password" | "confirmPassword">, value: string) => {
      setFormState((prev) => ({
        ...prev,
        [field]: value,
        fieldErrors: {
          ...prev.fieldErrors,
          [field]: undefined,
        },
      }));
    },
    []
  );

  const isFormValid =
    formState.email.trim().length > 0 && formState.password.length > 0 && formState.confirmPassword.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto">
      <div className="p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Create your account</h1>
          <p className="text-sm sm:text-base text-neutral-600">Start learning smarter with AI-powered flashcards</p>
        </div>

        {/* Global Error */}
        {error && (
          <div
            className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor={emailId} className="block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id={emailId}
              type="email"
              value={formState.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="you@example.com"
              disabled={isSubmitting}
              aria-invalid={!!formState.fieldErrors.email}
              aria-describedby={formState.fieldErrors.email ? `${emailId}-error` : undefined}
              className={`w-full max-w-full h-11 px-4 rounded-lg border-2 box-border ${
                formState.fieldErrors.email ? "border-red-500" : "border-neutral-300"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 text-base disabled:bg-neutral-100 disabled:cursor-not-allowed`}
            />
            {formState.fieldErrors.email && (
              <p id={`${emailId}-error`} className="text-sm text-red-600 font-medium" role="alert">
                {formState.fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor={passwordId} className="block text-sm font-medium text-neutral-700">
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              value={formState.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="At least 8 characters"
              disabled={isSubmitting}
              aria-invalid={!!formState.fieldErrors.password}
              aria-describedby={formState.fieldErrors.password ? `${passwordId}-error` : undefined}
              className={`w-full max-w-full h-11 px-4 rounded-lg border-2 box-border ${
                formState.fieldErrors.password ? "border-red-500" : "border-neutral-300"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 text-base disabled:bg-neutral-100 disabled:cursor-not-allowed`}
            />
            {formState.fieldErrors.password && (
              <p id={`${passwordId}-error`} className="text-sm text-red-600 font-medium" role="alert">
                {formState.fieldErrors.password}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label htmlFor={confirmPasswordId} className="block text-sm font-medium text-neutral-700">
              Confirm Password
            </label>
            <input
              id={confirmPasswordId}
              type="password"
              value={formState.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              placeholder="Re-enter your password"
              disabled={isSubmitting}
              aria-invalid={!!formState.fieldErrors.confirmPassword}
              aria-describedby={formState.fieldErrors.confirmPassword ? `${confirmPasswordId}-error` : undefined}
              className={`w-full max-w-full h-11 px-4 rounded-lg border-2 box-border ${
                formState.fieldErrors.confirmPassword ? "border-red-500" : "border-neutral-300"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 text-base disabled:bg-neutral-100 disabled:cursor-not-allowed`}
            />
            {formState.fieldErrors.confirmPassword && (
              <p id={`${confirmPasswordId}-error`} className="text-sm text-red-600 font-medium" role="alert">
                {formState.fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full h-11 text-base font-semibold bg-green-600 hover:bg-green-700 focus-visible:ring-green-500 border-0 shadow-none"
            size="lg"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>

        {/* Terms */}
        <p className="text-xs text-center text-neutral-500 px-4">
          By creating an account, you agree to our{" "}
          <a href="/terms" className="text-green-600 hover:text-green-700 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-green-600 hover:text-green-700 hover:underline">
            Privacy Policy
          </a>
        </p>

        {/* Login Link */}
        <div className="text-center text-sm text-neutral-600 pt-4 border-t border-neutral-200">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors"
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
