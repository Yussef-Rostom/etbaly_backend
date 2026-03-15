import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "#src/modules/auth/authRoutes";
import userRoutes from "#src/modules/user/userRoutes";
import adminRoutes from "#src/modules/admin/adminRoutes";
import catalogRoutes from "#src/modules/catalog/catalogRoutes";
import manufacturingRoutes from "#src/modules/manufacturing/manufacturingRoutes";
import { globalErrorHandler } from "#src/middlewares/errorHandler";
import { AppError } from "#src/utils/AppError";
import { env } from "#src/configs/envConfig";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/favicon.ico", (_req: Request, res: Response) => {
  res.status(204).end();
});

app.get("/", (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Etbaly Backend API</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d1117; color: #c9d1d9; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        h1 { color: #58a6ff; margin-bottom: 0.5rem; }
        p { font-size: 1.1rem; color: #8b949e; }
        .info { background: #161b22; padding: 2rem; border-radius: 12px; border: 1px solid #30363d; box-shadow: 0 8px 24px rgba(0,0,0,0.2); text-align: center; max-width: 500px; width: 90%; }
        a { color: #58a6ff; text-decoration: none; font-weight: 600; }
        a:hover { text-decoration: underline; }
        .env { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #30363d; font-size: 0.9rem; }
      </style>
    </head>
    <body>
      <div class="info">
        <h1>🚀 Etbaly Backend</h1>
        <p>The API server is successfully running.</p>
        <p>Check the <a href="/api/v1/health">Health Endpoint</a> or see the documentation for API details.</p>
        <div class="env">Environment: <strong>${env.NODE_ENV}</strong></div>
      </div>
    </body>
    </html>
  `);
});

app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running 🚀",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/catalog", catalogRoutes);
app.use("/api/v1/manufacturing", manufacturingRoutes);

app.use((req: Request, _res: Response) => {
  throw new AppError(
    `Cannot find ${req.method} ${req.originalUrl} on this server.`,
    404,
  );
});

app.use(globalErrorHandler);

export default app;
