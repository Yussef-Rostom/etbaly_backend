import { z } from "zod";

export const addCartItemSchema = z.object({
  itemType: z.enum(["Product", "Design"]),
  itemRefId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  materialId: z.string().optional(),
  customization: z
    .object({
      color: z.string().optional(),
      infillPercentage: z.number().optional(),
      layerHeight: z.number().optional(),
      scale: z.number().optional(),
      customFields: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const checkoutSchema = z.object({
  shippingAddressId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"),
  paymentMethod: z.enum(["Card", "Wallet", "COD"]),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
