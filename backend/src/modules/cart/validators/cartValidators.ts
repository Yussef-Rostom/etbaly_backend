import { z } from "zod";

export const addCartItemSchema = z.object({
  itemType: z.enum(["Product", "Design"]),
  itemRefId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  printingProperties: z
    .object({
      material: z.string({ required_error: "material is required" }),
      color: z.string().optional(),
      scale: z.number().min(0.1).max(10).optional(),
      preset: z.enum(["heavy", "normal", "draft"]).optional(),
      customFields: z
        .array(z.object({ key: z.string(), value: z.string() }))
        .optional(),
    }),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const checkoutSchema = z.object({
  shippingAddress: z.object({
    street: z.string().trim().min(1, "Street is required"),
    city: z.string().trim().min(1, "City is required"),
    country: z.string().trim().min(1, "Country is required"),
    zip: z.string().trim().min(1, "ZIP code is required"),
  }),
  paymentMethod: z.enum(["Card", "Wallet", "COD"]),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
