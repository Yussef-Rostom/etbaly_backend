import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "#src/modules/auth/routes/authRoutes";
import userRoutes from "#src/modules/user/routes/userRoutes";
import userAdminRoutes from "#src/modules/user/routes/userAdminRoutes";
import productRoutes from "#src/modules/product/routes/productRoutes";
import productAdminRoutes from "#src/modules/product/routes/productAdminRoutes";
import manufacturingRoutes from "#src/modules/manufacturing/routes/manufacturingAdminRoutes";
import cartRoutes from "#src/modules/cart/routes/cartRoutes";
import orderRoutes from "#src/modules/order/routes/orderRoutes";
import orderAdminRoutes from "#src/modules/order/routes/orderAdminRoutes";
import designRoutes from "#src/modules/design/routes/designRoutes";
import designAdminRoutes from "#src/modules/design/routes/designAdminRoutes";
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

// ─── Public Routes ────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/designs", designRoutes);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
app.use("/api/v1/admin/users", userAdminRoutes);
app.use("/api/v1/admin/products", productAdminRoutes);
app.use("/api/v1/admin/manufacturing", manufacturingRoutes);
app.use("/api/v1/admin/designs", designAdminRoutes);
app.use("/api/v1/admin/orders", orderAdminRoutes);

app.use((req: Request, _res: Response) => {
  throw new AppError(
    `Cannot find ${req.method} ${req.originalUrl} on this server.`,
    404,
  );
});

app.use(globalErrorHandler);

export default app;
