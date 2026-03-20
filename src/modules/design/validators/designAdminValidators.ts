import { z } from "zod";

const materialEnum = z.enum(["PLA", "ABS", "Resin", "TPU", "PETG"]);

const metadataSchema = z.object({
  volumeCm3: z.number().positive("volumeCm3 must be a positive number"),
  dimensions: z.object({
    x: z.number().positive("dimensions.x must be a positive number"),
    y: z.number().positive("dimensions.y must be a positive number"),
    z: z.number().positive("dimensions.z must be a positive number"),
  }),
  estimatedPrintTime: z.number().positive("estimatedPrintTime must be a positive number"),
  supportedMaterials: z
    .array(materialEnum)
    .min(1, "supportedMaterials must contain at least one material"),
});

export const createDesignSchema = z.object({
  name: z.string().min(1, "name is required").trim(),
  fileUrl: z.string().url("fileUrl must be a valid URL"),
  metadata: metadataSchema,
  isPrintable: z.boolean().optional(),
});

export const updateDesignSchema = z.object({
  name: z.string().min(1, "name cannot be empty").trim().optional(),
  fileUrl: z.string().url("fileUrl must be a valid URL").optional(),
  metadata: metadataSchema.partial().optional(),
  isPrintable: z.boolean().optional(),
});

export type CreateDesignInput = z.infer<typeof createDesignSchema>;
export type UpdateDesignInput = z.infer<typeof updateDesignSchema>;
