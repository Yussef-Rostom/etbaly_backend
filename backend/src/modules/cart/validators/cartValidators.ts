import { z } from "zod";

export const addCartItemSchema = z
  .object({
    itemType: z.enum(["Product", "Design"]).optional(),
    itemRefId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId").optional(),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    slicingJobId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId").optional(),
    printingProperties: z
      .object({
        material: z.string().optional(),
        color: z.string().optional(),
        scale: z
          .number()
          .min(1, "scale must be at least 1 (1%)")
          .max(1000, "scale must be at most 1000 (1000%)")
          .optional(),
        preset: z.enum(["heavy", "normal", "draft"]).optional(),
        customFields: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // Mode 1: If slicingJobId is provided, no other fields are needed
      if (data.slicingJobId) {
        return !data.itemType && !data.itemRefId && !data.printingProperties;
      }
      // Mode 2: If slicingJobId is not provided, itemType, itemRefId, and printingProperties are required
      return (
        data.itemType &&
        data.itemRefId &&
        data.printingProperties &&
        data.printingProperties.material &&
        data.printingProperties.color
      );
    },
    {
      message:
        "Either provide slicingJobId only (with quantity), or provide itemType, itemRefId, and printingProperties (with material and color)",
    }
  );

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
