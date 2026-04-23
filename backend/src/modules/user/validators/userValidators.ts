import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z
    .string({ error: "First name must be a string" })
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be at most 50 characters")
    .trim()
    .optional(),
  lastName: z
    .string({ error: "Last name must be a string" })
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be at most 50 characters")
    .trim()
    .optional(),
  phoneNumber: z
    .string({ error: "Phone number must be a string" })
    .regex(/^01[0125][0-9]{8}$/, "Must be a valid Egyptian phone number")
    .optional(),
  avatarUrl: z
    .string({ error: "Avatar URL must be a string" })
    .url("Must be a valid URL")
    .optional(),
  bio: z
    .string({ error: "Bio must be a string" })
    .max(500, "Bio must be at most 500 characters")
    .optional(),
  savedAddresses: z
    .array(
      z.object({
        street: z
          .string({ error: "Street must be a string" })
          .trim()
          .min(1, "Street is required"),
        city: z
          .string({ error: "City must be a string" })
          .trim()
          .min(1, "City is required"),
        country: z
          .string({ error: "Country must be a string" })
          .trim()
          .min(1, "Country is required"),
        zip: z
          .string({ error: "Zip code must be a string" })
          .trim()
          .min(1, "Zip code is required"),
      }),
    )
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string({ error: "Current password is required" }).min(1, "Current password is required"),
  newPassword: z
    .string({ error: "New password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/,
      "Password must contain at least one letter, one number, and one special character",
    ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
