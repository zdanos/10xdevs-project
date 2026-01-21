import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { ProfileDTO } from "../../types";

/**
 * Custom error class for profile service errors
 */
export class ProfileServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileServiceError";
  }
}

/**
 * Custom error class for profile not found errors
 */
export class ProfileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileNotFoundError";
  }
}

/**
 * Retrieves the authenticated user's profile with quota information
 * Returns only the fields needed for client-side quota management
 *
 * Authentication:
 * - Extracts user ID from Supabase auth session
 *
 * @param supabase - Authenticated Supabase client from context.locals
 * @returns Profile data with quota statistics
 * @throws ProfileNotFoundError if user profile doesn't exist
 * @throws ProfileServiceError if database query fails or user not authenticated
 *
 * Used in: GET /api/profile
 *
 * @example
 * const profile = await getUserProfile(supabase);
 * // Returns: {
 * //   generations_count: 5,
 * //   last_generation_date: "2026-01-15T14:30:00.000Z",
 * //   last_reset_date: "2026-01-15T00:00:00.000Z"
 * // }
 */
export async function getUserProfile(supabase: SupabaseClient<Database>): Promise<ProfileDTO> {
  try {
    // Get authenticated user from Supabase auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[ProfileService] User not authenticated:", {
        authError: authError?.message,
        timestamp: new Date().toISOString(),
      });
      throw new ProfileServiceError("User not authenticated");
    }

    const userId = user.id;

    // Query profiles table for specific fields only
    const { data, error } = await supabase
      .from("profiles")
      .select("generations_count, last_generation_date, last_reset_date")
      .eq("id", userId)
      .single();

    // Handle "no rows returned" error (PostgREST PGRST116)
    if (error?.code === "PGRST116") {
      console.error("[ProfileService] Profile not found:", {
        userId,
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      });
      throw new ProfileNotFoundError(`Profile not found for user: ${userId}`);
    }

    // Handle other database errors
    if (error) {
      console.error("[ProfileService] Database error during getUserProfile:", {
        userId,
        error: error.message,
        code: error.code,
        details: error.details,
        timestamp: new Date().toISOString(),
      });
      throw new ProfileServiceError("Failed to fetch user profile");
    }

    // Ensure data was returned
    if (!data) {
      console.error("[ProfileService] No data returned from getUserProfile:", {
        userId,
        timestamp: new Date().toISOString(),
      });
      throw new ProfileServiceError("Failed to fetch user profile: No data returned");
    }

    return data;
  } catch (error) {
    // Re-throw known error types
    if (error instanceof ProfileNotFoundError || error instanceof ProfileServiceError) {
      throw error;
    }

    // Handle unexpected errors
    console.error("[ProfileService] Unexpected error in getUserProfile:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
    throw new ProfileServiceError("Failed to fetch user profile due to an unexpected error");
  }
}
