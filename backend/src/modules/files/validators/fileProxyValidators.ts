import { z } from "zod";

export const fileProxyQuerySchema = z.object({
  url: z
    .string("Query parameter 'url' is required.")
    .min(1, "Query parameter 'url' must not be empty."),
});

export type FileProxyQuery = z.infer<typeof fileProxyQuerySchema>;
