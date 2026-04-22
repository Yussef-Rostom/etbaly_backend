import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { AppError } from "#src/utils/AppError";

export const generateDesignFromImageSchema = z.object({
  designName: z
    .string()
    .min(2, "Design name must be at least 2 characters")
    .max(100, "Design name must not exceed 100 characters")
    .trim(),
});

export const generateImageFromTextSchema = z.object({
  designName: z
    .string()
    .min(2, "Design name must be at least 2 characters")
    .max(100, "Design name must not exceed 100 characters")
    .trim(),
  prompt: z
    .string()
    .min(1, "Prompt cannot be empty")
    .max(500, "Prompt must be 500 characters or less")
    .trim(),
});

export type GenerateDesignFromImageInput = z.infer<typeof generateDesignFromImageSchema>;
export type GenerateImageFromTextInput = z.infer<typeof generateImageFromTextSchema>;

/**
 * Middleware to validate that an image file was uploaded
 */
export const validateImageUpload = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.file) {
    throw new AppError("Image file is required", 400);
  }
  next();
};
