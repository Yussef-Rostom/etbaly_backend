import { Request, Response } from "express";
import app from "#src/app";
import { connectDB } from "#src/configs/databaseConfig";

export default async function handler(req: Request, res: Response) {
  // Ensure the database is connected before handling the request.
  // The connectDB function already handles connection pooling.
  await connectDB();
  
  // Forward the request to the compiled Express application
  return app(req, res);
}
