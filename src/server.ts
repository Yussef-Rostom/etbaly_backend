import { Request, Response } from "express";
import mongoose from "mongoose";
import app from "#src/app";
import { connectDB, disconnectDB } from "#src/configs/databaseConfig";
import { env } from "#src/configs/envConfig";
import { startAllCronJobs } from "#src/jobs/crons";
import { setupGracefulShutdown } from "#src/utils/processManager";
import { initializeSettings } from "#src/utils/initializeSettings";

/**
 * Determines the deployment mode based on the RUNNING_METHOD environment variable.
 * @returns 'serverless' if RUNNING_METHOD equals "vercel", 'local' otherwise
 */
function getDeploymentMode(): 'local' | 'serverless' {
  return env.RUNNING_METHOD === "vercel" ? 'serverless' : 'local';
}

/**
 * Initializes and starts the application in traditional server mode.
 * Used for local development and Docker deployments.
 */
async function startLocalServer(): Promise<void> {
  await connectDB();

  // Initialize settings from environment variables
  await initializeSettings();

  startAllCronJobs();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(
      `🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`,
    );
    console.log(`📍 Health check: http://0.0.0.0:${env.PORT}/api/v1/health`);
  });

  setupGracefulShutdown("API Server", [
    () => new Promise((resolve) => server.close(resolve)),
    async () => await disconnectDB(),
  ]);
}

/**
 * Serverless handler function for processing HTTP requests.
 * Ensures database connection exists and forwards requests to Express app.
 * @param req - HTTP request object
 * @param res - HTTP response object
 */
async function serverlessHandler(req: Request, res: Response): Promise<void> {
  try {
    // Ensure database connection exists (reuse existing connection on warm starts)
    if (mongoose.connection.readyState < 1) {
      await connectDB();
    }
    
    // Forward request to Express app for processing
    app(req, res);
  } catch (error) {
    console.error('❌ Serverless handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}

// Conditional execution based on deployment mode
const mode = getDeploymentMode();

if (mode === 'local') {
  startLocalServer();
}

// Export serverless handler as default for serverless platforms
export default serverlessHandler;
