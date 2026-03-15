/**
 * Centralized process error handling & graceful shutdown.
 * Eliminates duplicated process.on() logic across entry points.
 */

type CleanupHandler = () => Promise<any> | any;

export const setupGracefulShutdown = (
  processName: string,
  cleanupHandlers: CleanupHandler[],
): void => {
  process.on("uncaughtException", (err: Error) => {
    console.error(`💥 [${processName}] UNCAUGHT EXCEPTION! Shutting down...`);
    console.error(err.name, err.message);
    process.exit(1);
  });

  process.on("unhandledRejection", (err: Error) => {
    console.error(`💥 [${processName}] UNHANDLED REJECTION! Shutting down...`);
    console.error(err.name, err.message);
    process.exit(1);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(
      `\n🛑 [${processName}] Received ${signal}. Shutting down gracefully...`,
    );

    try {
      for (const handler of cleanupHandlers) {
        await handler();
      }

      console.log(`✅ [${processName}] Cleanup completed successfully.`);
      process.exit(0);
    } catch (error) {
      console.error(`❌ [${processName}] Error during shutdown:`, error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};
