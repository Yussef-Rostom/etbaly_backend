// src/workers/slicing/index.ts
import { QUEUE_NAMES } from "#src/utils/queueManager";
import { registerWorker } from "../registry";
import { SlicingWorkerHandler } from "./handlers/slicingWorkerHandler";
import { SlicingJobData } from "./types";

/**
 * Start the slicing worker to process 3D model slicing jobs
 * Converts STL files to G-code with calculated metrics (weight, dimensions, print time, price)
 * 
 * @returns Worker instance
 */
export const startSlicingWorker = () => {
  return registerWorker<SlicingJobData>({
    queueName: QUEUE_NAMES.SLICING,
    concurrency: 1, // Process one slicing job at a time due to CPU intensity
    handler: SlicingWorkerHandler.handle
  });
};
