import app from "#src/app";
import { connectDB, disconnectDB } from "#src/configs/databaseConfig";
import { env } from "#src/configs/envConfig";
import { startAllCronJobs } from "#src/jobs/crons";
import { setupGracefulShutdown } from "#src/utils/processManager";

const startServer = async (): Promise<void> => {
  await connectDB();

  startAllCronJobs();

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
