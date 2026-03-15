import { processSlicingJob } from "./slicingMockWorker";
import { processPrintingJob } from "./printingMockWorker";

// Type definition for a mock worker handler function
type MockWorkerHandler = (data: any) => Promise<void>;

// Registry mapping queue names to their respective mock processing handlers
const mockRegistry: Record<string, MockWorkerHandler> = {
  "slicing-tasks": processSlicingJob,
  "3d-printing-tasks": processPrintingJob,
};

/**
 * Route a mock job to its required handler based on the queue name.
 */
export const processMockJob = async (queueName: string, data: any) => {
  const handler = mockRegistry[queueName];

  if (handler) {
    // Execute the bound handler
    return handler(data);
  } else {
    console.warn(`⚠️  [Mock Worker] Unknown queue: "${queueName}". Job ignored.`);
  }
};
