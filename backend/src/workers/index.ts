// src/workers/index.ts
import { startAiWorker } from "./imageTo3d";
import { startTextToImageWorker } from "./textToImage";
import { startSlicingWorker } from "./slicing";
import { shutdownAllWorkers } from "./registry";

export const initializeWorkers = () => {
  console.log("🚀 Starting unified Worker Registry...");
  console.log("⚡ Workers will attempt real implementations with automatic fallback to mock");
  
  startAiWorker();
  startTextToImageWorker();
  startSlicingWorker();
  // Note: Printing is now manual via Admin API - no automated worker

  console.log("✅ All workers initialized successfully!");
};

// If run directly:
if (require.main === module) {
  initializeWorkers();

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down workers gracefully...`);
    await shutdownAllWorkers();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

export { shutdownAllWorkers };
