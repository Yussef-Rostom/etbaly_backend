import { z } from "zod";

export const objectIdParamSchema = z.object({ id: z.string() });

export type ObjectIdParam = z.infer<typeof objectIdParamSchema>;
