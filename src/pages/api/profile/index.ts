import type { APIRoute } from "astro";
import { getUserProfile, ProfileNotFoundError } from "@/lib/services/profile.service";
import { supabaseClient } from "@/db/supabase.client";

export const prerender = false;

/**
 * GET /api/profile
 * Retrieves the authenticated user's profile information and quota statistics
 *
 * Authentication is handled within the service layer, which extracts the user ID
 * from the Supabase auth session. For testing purposes, falls back to DEFAULT_USER_ID
 * when authentication is not yet fully implemented.
 *
 * Returns quota data needed for client-side quota management:
 * - generations_count: Number of AI generations used in current 24h cycle (0-10)
 * - last_generation_date: ISO 8601 timestamp of last generation (nullable)
 * - last_reset_date: ISO 8601 timestamp of last quota reset
 *
 * @returns 200 with ProfileDTO on success
 * @returns 404 if user profile not found
 * @returns 500 for server errors
 */
export const GET: APIRoute = async () => {
  try {
    // For now, use the global supabase client
    // TODO: Replace with authenticated client from locals.supabase after auth implementation
    // The service will handle extracting the user ID from auth or falling back to DEFAULT_USER_ID
    const profile = await getUserProfile(supabaseClient);

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle profile not found error (404)
    if (error instanceof ProfileNotFoundError) {
      console.error("[API /api/profile GET] Profile not found:", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "User profile not found",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Handle all other errors (500)
    console.error("[API /api/profile GET] Request failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to fetch user profile",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
