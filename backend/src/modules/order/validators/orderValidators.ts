import { z } from "zod";

export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"),
});

export const adminOrdersQuerySchema = z.object({
  status: z
    .enum(["Pending", "Processing", "Shipped", "Delivered", "Cancelled"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ObjectIdParam = z.infer<typeof objectIdParamSchema>;
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;
