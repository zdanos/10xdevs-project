/**
 * Register API endpoint
 * Handles user registration with email and password
 */

import type { APIRoute } from "astro";
import { registerSchema } from "@/lib/validators/auth.validator";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid input",
          details: result.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { email, password } = result.data;
    const supabase = locals.supabase;

    if (!supabase) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication service unavailable",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Attempt to sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Email confirmation is disabled in Supabase config
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      // Map Supabase errors to user-friendly messages
      let message = "Failed to create account";

      if (error.message.includes("User already registered")) {
        message = "An account with this email already exists";
      } else if (error.message.includes("Password should be at least")) {
        message = "Password must be at least 8 characters";
      } else if (error.message.includes("invalid email")) {
        message = "Please enter a valid email address";
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!data.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create account. Please try again.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Return success with redirect URL (to generator per PRD)
    return new Response(
      JSON.stringify({
        success: true,
        redirectTo: "/app/generate",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Registration error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
