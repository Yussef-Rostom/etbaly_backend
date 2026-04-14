import { z } from "zod";

export const generateDesignSchema = z.object({
  designName: z
    .string()
    .min(2, "Design name must be at least 2 characters")
    .max(100, "Design name must not exceed 100 characters")
    .trim(),
});

export type GenerateDesignInput = z.infer<typeof generateDesignSchema>;
