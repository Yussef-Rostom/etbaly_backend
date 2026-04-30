import { z } from "zod";

export const objectIdParamSchema = z.object({ id: z.string() });

export const jobIdParamSchema = z.object({ 
  jobId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid job ID") 
});

export const uploadDesignSchema = z.object({
  name: z
    .string("name is required")
    .min(1, "name cannot be empty")
    .max(100, "name must not exceed 100 characters")
    .trim(),
});

export type ObjectIdParam = z.infer<typeof objectIdParamSchema>;
export type JobIdParam = z.infer<typeof jobIdParamSchema>;
export type UploadDesignInput = z.infer<typeof uploadDesignSchema>;
