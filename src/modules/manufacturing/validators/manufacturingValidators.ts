import { z } from "zod";

export const executeJobSchema = z.object({
  body: z.object({
    jobId: z
      .string()
      .trim()
      .min(1, "jobId cannot be empty"),
    action: z.enum(["start_slicing", "start_printing"]),
  }),
});
