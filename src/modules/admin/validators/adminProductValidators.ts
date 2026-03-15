import { z } from "zod";
import mongoose from "mongoose";

const objectIdValidator = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId format",
  });

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").trim(),
  description: z.string().trim().optional(),
  currentBasePrice: z.number().min(0, "Price cannot be negative"),
  isActive: z.boolean().optional(),
  stockLevel: z.number().min(0, "Stock level cannot be negative").optional(),
  linkedDesignId: objectIdValidator,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
