import { z } from "zod";

export const createMaterialSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Material name is required"),
    type: z.enum(["PLA", "ABS", "Resin", "TPU", "PETG"], {
      errorMap: () => ({ message: "Material type must be one of: PLA, ABS, Resin, TPU, PETG" }),
    }),
    currentPricePerGram: z.number().min(0, "Price cannot be negative"),
    color: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateMaterialSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid material ID"),
  }),
  body: z.object({
    name: z.string().trim().min(1, "Material name is required").optional(),
    currentPricePerGram: z.number().min(0, "Price cannot be negative").optional(),
    color: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const deleteMaterialSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid material ID"),
  }),
});
