import { z } from "zod";

export const updateRoleSchema = z.object({
  role: z.enum(["client", "admin", "operator"], {
    message: "Role must be one of: client, admin, operator",
  }),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
