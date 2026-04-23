import { Response } from 'express';

interface ApiResponsePayload {
  success: boolean;
  message: string;
  data?: any;
  stack?: string;
}

export const sendSuccess = (
  res: Response,
  statusCode: number,
  message: string,
  data?: any,
): Response => {
  const payload: ApiResponsePayload = { success: true, message };
  if (data !== undefined) payload.data = data;
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  data?: any,
  stack?: string,
): Response => {
  const payload: ApiResponsePayload = { success: false, message };
  if (data !== undefined) payload.data = data;
  if (stack !== undefined) payload.stack = stack;
  return res.status(statusCode).json(payload);
};
