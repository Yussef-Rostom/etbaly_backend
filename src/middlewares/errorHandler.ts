import { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/AppError";
import { env } from "@/configs/envConfig";
import { sendError } from "@/utils/apiResponse";

const handleCastError = (err: any): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateKeyError = (err: any): AppError => {
  const field = Object.keys(err.keyValue)[0];
  const message = `Duplicate value for field "${field}". Please use another value.`;
  return new AppError(message, 409);
};

const handleValidationError = (err: any): AppError => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Validation failed: ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = (): AppError =>
  new AppError("Invalid token. Please log in again.", 401);

const handleJWTExpiredError = (): AppError =>
  new AppError("Your token has expired. Please log in again.", 401);

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  if (env.NODE_ENV === "development") {
    console.error("🔥 ERROR:", err);
  }

  let error = { ...err, message: err.message };

  if (err.name === "CastError") error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err.name === "ValidationError") error = handleValidationError(err);
  if (err.name === "JsonWebTokenError") error = handleJWTError();
  if (err.name === "TokenExpiredError") error = handleJWTExpiredError();

  sendError(
    res,
    error.statusCode || 500,
    error.message,
    undefined,
    env.NODE_ENV === "development" ? err.stack : undefined,
  );
};
