import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { sendError } from "#src/utils/apiResponse";

type ValidationTarget = "body" | "params" | "query";

export const validate = (
  schema: ZodSchema,
  target: ValidationTarget = "body",
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const formattedErrors = result.error.issues.map((issue: any) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      sendError(res, 400, "Validation failed", { errors: formattedErrors });
      return;
    }

    req[target] = result.data;
    next();
  };
};
