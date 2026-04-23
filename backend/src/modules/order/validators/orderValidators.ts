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

export const assignOrderItemSchema = z.object({
  orderItemId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"),
  machineId: z.string().trim().min(1, "machineId must not be empty"),
});

export type ObjectIdParam = z.infer<typeof objectIdParamSchema>;
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;
export type AssignOrderItemInput = z.infer<typeof assignOrderItemSchema>;
