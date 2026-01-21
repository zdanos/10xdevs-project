import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";
import dotenv from "dotenv";
import path from "path";

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * Global teardown function that runs after all tests
 * Cleans up test data from the database
 */
async function globalTeardown() {
  console.log("\n🧹 Running global teardown: Cleaning up test data...");

  // Validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const testUsername = process.env.E2E_USERNAME;
  const testPassword = process.env.E2E_PASSWORD;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: SUPABASE_URL or SUPABASE_KEY not found in .env.test");
    return;
  }

  if (!testUsername || !testPassword) {
    console.error("❌ Error: E2E_USERNAME or E2E_PASSWORD not found in .env.test");
    return;
  }

  try {
    // Create Supabase client for cleanup
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Authenticate as test user to respect RLS policies
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: testUsername,
      password: testPassword,
    });

    if (authError) {
      console.error("❌ Error authenticating test user:", authError.message);
      throw authError;
    }

    // Delete all decks created during tests
    // Note: Flashcards will be automatically deleted due to CASCADE constraint
    const { error: decksError, count } = await supabase.from("decks").delete().not("id", "is", null);

    if (decksError) {
      console.error("❌ Error deleting decks:", decksError.message);
      throw decksError;
    }

    console.log(`✅ Successfully deleted ${count ?? 0} deck(s) from test database`);
    console.log("   (Associated flashcards automatically deleted via CASCADE)");

    // Sign out after cleanup
    await supabase.auth.signOut();
  } catch (error) {
    console.error("❌ Global teardown failed:", error);
    throw error;
  }
}

export default globalTeardown;
