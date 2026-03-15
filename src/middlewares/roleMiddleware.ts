import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

export const restrictTo = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(
        "You do not have permission to perform this action.",
        403,
      );
    }
    next();
  };
};
