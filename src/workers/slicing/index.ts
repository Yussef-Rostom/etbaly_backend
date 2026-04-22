// src/workers/slicing/index.ts
import { QUEUE_NAMES } from "#src/utils/queueManager";
import { registerWorker } from "../registry";
import { SlicingWorkerHandler } from "./handlers/slicingWorkerHandler";
import { SlicingJobData } from "./types";

export const startSlicingWorker = () => {
  return registerWorker<SlicingJobData>({
    queueName: QUEUE_NAMES.SLICING,
    concurrency: 1,
    handler: SlicingWorkerHandler.handle
  });
};
