// src/workers/index.ts
import { startAiWorker } from "./ai";
import { startTextToImageWorker } from "./textToImage";
import { startSlicingWorker } from "./slicing";
import { startPrintingWorker } from "./printing";
import { shutdownAllWorkers } from "./registry";

export const initializeWorkers = () => {
  console.log("🚀 Starting unified Worker Registry...");
  console.log("⚡ Workers will attempt real implementations with automatic fallback to mock");
  
  startAiWorker();
  startTextToImageWorker();
  startSlicingWorker();
  startPrintingWorker();

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
