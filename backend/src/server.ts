import app from "#src/app";
import { connectDB, disconnectDB } from "#src/configs/databaseConfig";
import { env } from "#src/configs/envConfig";
import { setupGracefulShutdown } from "#src/utils/processManager";
import { initializeSettings } from "#src/utils/initializeSettings";
import { redisCache } from "#src/utils/redisCache";

/**
 * Initializes and starts the application server.
 * Used for local development and Docker deployments.
 */
async function startServer(): Promise<void> {
  await connectDB();

  // Initialize Redis cache connection
  await redisCache.connect();

  // Initialize settings from environment variables
  await initializeSettings();

  // Run Lightning AI URL migration
  const { migrateLightningAiUrls } = await import("#src/migrations/migrateLightningAiUrls");
  await migrateLightningAiUrls();

  // Initialize BullMQ workers
  const { initializeWorkers, shutdownAllWorkers } = await import("#src/workers");
  initializeWorkers();

  // Dynamically import crons only in local mode
  const { startAllCronJobs } = await import("#src/jobs/crons");
  startAllCronJobs();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(
      `🚀 Server running in ${env.APP_ENV} mode on port ${env.PORT}`,
    );
    console.log(`📍 Health check: http://0.0.0.0:${env.PORT}/api/v1/health`);
  });

  setupGracefulShutdown("API Server", [
    () => new Promise((resolve) => server.close(resolve)),
    async () => await shutdownAllWorkers(),
    async () => await redisCache.disconnect(),
    async () => await disconnectDB(),
  ]);
}

// Start the server
startServer();
