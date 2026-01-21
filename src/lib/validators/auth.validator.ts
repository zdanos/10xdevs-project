/**
 * Authentication validation schemas
 * Shared between client-side and server-side validation
 */

import { z } from "zod";

// Email validation schema
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .max(255, "Email is too long");

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be less than 72 characters");

// Login validation schema
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Register validation schema
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Export types for TypeScript
export type RegisterInput = z.infer<typeof registerSchema>;
