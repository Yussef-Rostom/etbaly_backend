import { z } from "zod";
import mongoose from "mongoose";

const objectIdValidator = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId format",
  });

const customFieldSchema = z.object({
  fieldName: z.string().trim().min(1, "Field name is required"),
  fieldType: z.enum(["text", "number", "date"]),
  isRequired: z.boolean().default(false),
  label: z.string().trim().min(1, "Label is required"),
  placeholder: z.string().trim().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").trim(),
  description: z.string().trim().optional(),
  images: z.array(z.string().url("Each image must be a valid URL")).optional(),
  isActive: z.boolean().optional(),
  linkedDesignId: objectIdValidator,
  slicingJobId: objectIdValidator,
  isCustomizable: z.boolean().optional(),
  customFields: z.array(customFieldSchema).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
