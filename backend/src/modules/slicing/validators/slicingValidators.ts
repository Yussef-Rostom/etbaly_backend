import { z } from "zod";

export const executeSlicingJobSchema = z.object({
  designId: z
    .string()
    .trim()
    .min(1, "designId cannot be empty")
    .regex(/^[0-9a-fA-F]{24}$/, "designId must be a valid MongoDB ObjectId"),
  material: z
    .string()
    .trim()
    .optional(),
  color: z
    .string()
    .trim()
    .optional(),
  preset: z
    .enum(["heavy", "normal", "draft"])
    .optional(),
  scale: z
    .number()
    .min(1, "scale must be at least 1 (1%)")
    .max(1000, "scale must be at most 1000 (1000%)")
    .optional(),
});

export type ExecuteSlicingJobInput = z.infer<typeof executeSlicingJobSchema>;

export const getSlicingJobStatusSchema = z.object({
  jobId: z
    .string()
    .trim()
    .min(1, "jobId cannot be empty")
    .regex(/^[0-9a-fA-F]{24}$/, "jobId must be a valid MongoDB ObjectId"),
});

export type GetSlicingJobStatusInput = z.infer<typeof getSlicingJobStatusSchema>;
