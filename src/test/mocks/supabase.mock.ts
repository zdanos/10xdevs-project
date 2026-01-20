import { vi } from "vitest";

/**
 * Mock Supabase client for testing
 * Use this in tests that interact with Supabase
 */
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  })),
  rpc: vi.fn(),
};

/**
 * Factory function to create a fresh mock client
 */
export const createMockSupabaseClient = () => {
  return {
    ...mockSupabaseClient,
    auth: { ...mockSupabaseClient.auth },
  };
};
