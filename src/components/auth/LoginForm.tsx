/**
 * LoginForm - Client-side login form component
 * Handles email/password input with validation and error display
 * Integrates with auth API for server-side authentication
 */

import { useState, useCallback, useId } from "react";
import { loginSchema } from "@/lib/validators/auth.validator";
import { Button } from "@/components/ui/button";

interface FormState {
  email: string;
  password: string;
  isSubmitting: boolean;
  globalError: string | null;
  fieldErrors: {
    email?: string;
    password?: string;
  };
}

export default function LoginForm() {
  const [formState, setFormState] = useState<FormState>({
    email: "",
    password: "",
    isSubmitting: false,
    globalError: null,
    fieldErrors: {},
  });

  const emailId = useId();
  const passwordId = useId();

  const validateForm = useCallback((): boolean => {
    const result = loginSchema.safeParse({
      email: formState.email,
      password: formState.password,
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
  }, [formState.email, formState.password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      // Set loading state
      setFormState((prev) => ({
        ...prev,
        isSubmitting: true,
        globalError: null,
      }));

      try {
        // Call auth API for login
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formState.email.trim(),
            password: formState.password,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          // Handle auth error
          setFormState((prev) => ({
            ...prev,
            isSubmitting: false,
            globalError: data.error || "Failed to sign in. Please try again.",
          }));
          return;
        }

        if (data.redirectTo) {
          // Redirect to the specified URL
          window.location.href = data.redirectTo;
        } else {
          setFormState((prev) => ({
            ...prev,
            isSubmitting: false,
            globalError: "Authentication failed. Please try again.",
          }));
        }
      } catch (err) {
        // Handle unexpected errors
        setFormState((prev) => ({
          ...prev,
          isSubmitting: false,
          globalError: "An unexpected error occurred. Please try again.",
        }));
        console.error("Login error:", err);
      }
    },
    [validateForm, formState.email, formState.password]
  );

  const updateField = useCallback((field: keyof Pick<FormState, "email" | "password">, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
      fieldErrors: {
        ...prev.fieldErrors,
        [field]: undefined,
      },
    }));
  }, []);

  const isFormValid = formState.email.trim().length > 0 && formState.password.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto">
      <div className="p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Welcome back</h1>
          <p className="text-sm sm:text-base text-neutral-600">Sign in to your account to continue</p>
        </div>

        {/* Global Error */}
        {formState.globalError && (
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
              <span>{formState.globalError}</span>
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
              disabled={formState.isSubmitting}
              aria-invalid={!!formState.fieldErrors.email}
              aria-describedby={formState.fieldErrors.email ? `${emailId}-error` : undefined}
              data-testid="login-email-input"
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
              placeholder="Enter your password"
              disabled={formState.isSubmitting}
              aria-invalid={!!formState.fieldErrors.password}
              aria-describedby={formState.fieldErrors.password ? `${passwordId}-error` : undefined}
              data-testid="login-password-input"
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

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isFormValid || formState.isSubmitting}
            className="w-full h-11 text-base font-semibold bg-green-600 hover:bg-green-700 focus-visible:ring-green-500 border-0 shadow-none"
            size="lg"
            data-testid="login-submit-button"
          >
            {formState.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {/* Register Link */}
        <div className="text-center text-sm text-neutral-600 pt-4 border-t border-neutral-200">
          Don&apos;t have an account?{" "}
          <a
            href="/register"
            className="font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors"
          >
            Create account
          </a>
        </div>
      </div>
    </div>
  );
}
