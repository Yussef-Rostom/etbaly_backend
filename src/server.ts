import app from "./app";
import { connectDB, disconnectDB } from "./configs/databaseConfig";
import { env } from "./configs/envConfig";
import { startCleanupJob } from "./jobs/cron/cleanupUnverifiedUsers";
import { setupGracefulShutdown } from "./utils/processManager";

const startServer = async (): Promise<void> => {
  await connectDB();

  startCleanupJob();

  const server = app.listen(env.PORT, () => {
    console.log(
      `🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`,
    );
    console.log(`📍 Health check: http://localhost:${env.PORT}/api/v1/health`);
  });

  setupGracefulShutdown("API Server", [
    () => new Promise((resolve) => server.close(resolve)),
    async () => await disconnectDB(),
  ]);
};

startServer();
