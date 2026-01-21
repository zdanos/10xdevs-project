import { describe, it, expect } from "vitest";
import { cn } from "./utils";

/**
 * Example unit test for utility functions
 * Demonstrates:
 * - Basic test structure with describe/it blocks
 * - Multiple test cases
 * - Clear assertions
 */
describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    const result = cn("bg-red-500", "text-white");
    expect(result).toBe("bg-red-500 text-white");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });

  it("should override conflicting Tailwind classes", () => {
    const result = cn("p-4", "p-8");
    expect(result).toBe("p-8");
  });

  it("should handle undefined and null values", () => {
    const result = cn("base-class", undefined, null, "another-class");
    expect(result).toBe("base-class another-class");
  });

  it("should handle empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });
});
