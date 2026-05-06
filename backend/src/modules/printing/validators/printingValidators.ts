import { z } from "zod";

export const executePrintingJobSchema = z.object({
  slicingJobId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "slicingJobId must be a valid MongoDB ObjectId"),
});

export type ExecutePrintingJobInput = z.infer<typeof executePrintingJobSchema>;

export const reviewPrintingJobSchema = z.object({
  jobId: z
    .string()
    .trim()
    .min(1, "jobId cannot be empty"),
  action: z.enum(["approve", "reject"]),
});

export type ReviewPrintingJobInput = z.infer<typeof reviewPrintingJobSchema>;

export const queuePrintingJobSchema = z.object({
  jobId: z
    .string()
    .trim()
    .min(1, "jobId cannot be empty"),
});

export type QueuePrintingJobInput = z.infer<typeof queuePrintingJobSchema>;

export const startPrintingJobSchema = z.object({
  jobId: z
    .string()
    .trim()
    .min(1, "jobId cannot be empty"),
  machineId: z
    .string()
    .trim()
    .optional(),
});

export type StartPrintingJobInput = z.infer<typeof startPrintingJobSchema>;

export const completePrintingJobSchema = z.object({
  jobId: z
    .string()
    .trim()
    .min(1, "jobId cannot be empty"),
});

export type CompletePrintingJobInput = z.infer<typeof completePrintingJobSchema>;

export const failPrintingJobSchema = z.object({
  jobId: z
    .string()
    .trim()
    .min(1, "jobId cannot be empty"),
  reason: z
    .string()
    .trim()
    .optional(),
});

export type FailPrintingJobInput = z.infer<typeof failPrintingJobSchema>;
