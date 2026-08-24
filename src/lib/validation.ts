import { z } from "zod";

// Shared, consistently-capped field schemas so every API rejects oversized or
// malformed input with a clear 422 before it reaches the database.

export const idField = (max = 64) => z.string().min(1).max(max);

export const requiredName = (max = 80, message?: string) =>
  z.string().trim().min(1, message ?? "This field is required").max(max, `Must be at most ${max} characters`);

export const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

export const passwordField = () => z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters");

export const emailField = () => z.string().trim().email("Valid email required").max(254);

export const phoneField = () => z.string().trim().min(6, "Valid phone required").max(30);

export const money = (max = 1_000_000_000, label = "Amount") =>
  z.number({ message: `${label} must be a number` }).nonnegative(`${label} cannot be negative`).max(max, `${label} is too large`);

export const intRange = (min: number, max: number) => z.number().int().min(min).max(max);

/** Array of parseable date strings (ISO or YYYY-MM-DD), deduplicated upstream. */
export const dateStringArray = (maxItems = 24) =>
  z
    .array(
      z
        .string()
        .max(32)
        .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date — use YYYY-MM-DD")
    )
    .max(maxItems);

/** Treat empty string as null so HTML forms can clear optional URL/text fields. */
export const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), schema);

export const httpUrl = (max = 300) =>
  emptyToNull(
    z
      .string()
      .trim()
      .max(max)
      .refine((v) => /^https?:\/\/[^\s]+$/i.test(v), "Must be a valid http(s) URL")
  );

export const futureExpiry = (maxDays = 90) =>
  z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid expiry date")
    .refine((s) => Date.parse(s) > Date.now(), "Expiry must be in the future")
    .refine((s) => Date.parse(s) <= Date.now() + maxDays * 86_400_000, `Expiry cannot exceed ${maxDays} days`);
