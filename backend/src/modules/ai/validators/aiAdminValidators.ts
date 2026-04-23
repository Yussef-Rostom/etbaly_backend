import { z } from "zod";

export const setTextToImageUrlSchema = z.object({
  url: z.string().url("Must be a valid URL"),
});

export type SetTextToImageUrlInput = z.infer<typeof setTextToImageUrlSchema>;

export const setImageTo3dUrlSchema = z.object({
  url: z.string().url("Must be a valid URL"),
});

export type SetImageTo3dUrlInput = z.infer<typeof setImageTo3dUrlSchema>;
