import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "#src/modules/auth/authRoutes";
import userRoutes from "#src/modules/user/userRoutes";
import adminRoutes from "#src/modules/admin/adminRoutes";
import catalogRoutes from "#src/modules/catalog/catalogRoutes";
import manufacturingRoutes from "#src/modules/manufacturing/manufacturingRoutes";
import cartRoutes from "#src/modules/cart/cartRoutes";
import designRoutes from "#src/modules/design/designRoutes";
import { globalErrorHandler } from "#src/middlewares/errorHandler";
import { AppError } from "#src/utils/AppError";
import { env } from "#src/configs/envConfig";
import { getHomePage } from "#src/utils/homePage";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/favicon.ico", (_req: Request, res: Response) => res.status(204).end());
app.get("/", (_req: Request, res: Response) => res.send(getHomePage(env.NODE_ENV)));

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
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/designs", designRoutes);

app.use((req: Request, _res: Response) => {
  throw new AppError(
    `Cannot find ${req.method} ${req.originalUrl} on this server.`,
    404,
  );
});

app.use(globalErrorHandler);

export default app;
