import { Request, Response, NextFunction } from "express";
import jsonwebtoken from "jsonwebtoken";
import { env } from "#src/configs/envConfig";
import { AppError } from "#src/utils/AppError";
import { User } from "#src/models/User";
import { catchAsync } from "#src/utils/catchAsync";

const { verify } = jsonwebtoken;

declare global {
  namespace Express {
    interface Request {
      user?: any;
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
