/**
 * Login API endpoint
 * Handles user authentication with email and password
 */

import type { APIRoute } from "astro";
import { loginSchema } from "@/lib/validators/auth.validator";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const result = loginSchema.safeParse(body);
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

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Map Supabase errors to user-friendly messages
      let message = "Invalid email or password";

      if (error.message.includes("Invalid login credentials")) {
        message = "Invalid email or password";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Please confirm your email before logging in";
      } else if (error.message.includes("User not found")) {
        message = "No account found with this email";
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: message,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!data.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication failed",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Return success with redirect URL
    return new Response(
      JSON.stringify({
        success: true,
        redirectTo: "/app/decks",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Login error:", err);
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
