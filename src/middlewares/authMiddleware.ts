import { Request, Response, NextFunction } from "express";
import jsonwebtoken from "jsonwebtoken";
import { env } from "#src/configs/envConfig";
import { AppError } from "#src/utils/AppError";
import { User } from "#src/models/User";
import { catchAsync } from "#src/utils/catchAsync";
import type { Types } from "mongoose";

const { verify } = jsonwebtoken;

export interface AuthenticatedUser {
  _id: Types.ObjectId;
  email: string;
  role: "client" | "admin" | "operator";
  isVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authMiddleware = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new AppError(
        "You are not logged in. Please log in to get access.",
        401,
      );
    }

    const decoded = verify(token, env.JWT_SECRET) as {
      id: string;
      iat: number;
    };

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      throw new AppError(
        "The user belonging to this token no longer exists.",
        401,
      );
    }

    req.user = currentUser;
    next();
  },
);

/**
 * Retrieves the authenticated user from the request.
 * Throws a 401 if called on a route not protected by authMiddleware.
 */
export const getAuthUser = (req: Request): AuthenticatedUser => {
  if (!req.user) {
    throw new AppError("You are not logged in. Please log in to get access.", 401);
  }
  return req.user;
};
