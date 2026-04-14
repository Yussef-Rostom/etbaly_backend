import { z } from "zod";

export const setLightningUrlSchema = z.object({
  url: z.string().url("Must be a valid URL"),
});

export type SetLightningUrlInput = z.infer<typeof setLightningUrlSchema>;
