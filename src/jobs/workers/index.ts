import { processAiGenerationJob } from "#src/jobs/workers/aiWorker";

// Type definition for a worker handler function
type WorkerHandler = (data: any) => Promise<any>;

// Registry mapping queue names to their respective processing handlers
const workerRegistry: Record<string, WorkerHandler> = {
  "ai-generation-tasks": processAiGenerationJob,
};

/**
 * Route a job to its required handler based on the queue name.
 */
export const processWorkerJob = async (queueName: string, data: any) => {
  const handler = workerRegistry[queueName];

  if (handler) {
    // Execute the handler
    return handler(data);
  } else {
    console.warn(`⚠️  [Worker] Unknown queue: "${queueName}". Job ignored.`);
    return null;
  }
};

// Export individual workers for direct use
export { processAiGenerationJob } from "#src/jobs/workers/aiWorker";
