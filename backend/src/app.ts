import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "#src/modules/auth/routes/authRoutes";
import userRoutes from "#src/modules/user/routes/userRoutes";
import userAdminRoutes from "#src/modules/user/routes/userAdminRoutes";
import productRoutes from "#src/modules/product/routes/productRoutes";
import productAdminRoutes from "#src/modules/product/routes/productAdminRoutes";
import slicingRoutes from "#src/modules/slicing/routes/slicingRoutes";
import printingRoutes from "#src/modules/printing/routes/printingRoutes";
import cartRoutes from "#src/modules/cart/routes/cartRoutes";
import orderRoutes from "#src/modules/order/routes/orderRoutes";
import orderAdminRoutes from "#src/modules/order/routes/orderAdminRoutes";
import designRoutes from "#src/modules/design/routes/designRoutes";
import designAdminRoutes from "#src/modules/design/routes/designAdminRoutes";
import aiGenerationRoutes from "#src/modules/ai/routes/aiGenerationRoutes";
import aiAdminRoutes from "#src/modules/ai/routes/aiAdminRoutes";
import fileRoutes from "#src/modules/files/routes/fileRoutes";
import materialRoutes from "#src/modules/material/routes/materialRoutes";
import materialAdminRoutes from "#src/modules/material/routes/materialAdminRoutes";
import { globalErrorHandler } from "#src/middlewares/errorHandler";
import { AppError } from "#src/utils/AppError";
import { env } from "#src/configs/envConfig";
import { getHomePage } from "#src/utils/homePage";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan(env.APP_ENV === "development" ? "dev" : "combined"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/favicon.ico", (_req: Request, res: Response) => res.status(204).end());
app.get("/favicon.png", (_req: Request, res: Response) => res.status(204).end());
app.get("/", (_req: Request, res: Response) => res.send(getHomePage(env.APP_ENV)));

app.get("/api/v1/health", async (_req: Request, res: Response) => {
  try {
    const aiQueue = (await import("#src/utils/queueManager")).queueManager.getQueue("AI_GENERATION");
    
    // Check Redis connection via BullMQ client
    const client = await aiQueue.client;
    const redisStatus = await client.ping();

    // Check capacities
    const aiJobsCount = await aiQueue.getJobCounts('wait', 'active', 'failed');

    res.status(200).json({
      success: true,
      message: "Server is running 🚀",
      environment: env.APP_ENV,
      timestamp: new Date().toISOString(),
      queueStatus: {
        redis: redisStatus === "PONG" ? "connected" : "disconnected",
        aiQueue: aiJobsCount
      }
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      message: "Health check failed",
      error: error.message
    });
  }
});

// ─── Public Routes ────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/designs", designRoutes);
app.use("/api/v1/ai", aiGenerationRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1/slicing", slicingRoutes);
app.use("/api/v1/printing", printingRoutes);
app.use("/api/v1/materials", materialRoutes);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
app.use("/api/v1/admin/users", userAdminRoutes);
app.use("/api/v1/admin/products", productAdminRoutes);
app.use("/api/v1/admin/printing", printingRoutes);
app.use("/api/v1/admin/designs", designAdminRoutes);
app.use("/api/v1/admin/orders", orderAdminRoutes);
app.use("/api/v1/admin/ai", aiAdminRoutes);
app.use("/api/v1/admin/materials", materialAdminRoutes);

app.use((req: Request, _res: Response) => {
  throw new AppError(
    `Cannot find ${req.method} ${req.originalUrl} on this server.`,
    404,
  );
});

app.use(globalErrorHandler);

export default app;
