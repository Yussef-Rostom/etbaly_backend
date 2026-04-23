// src/workers/printing/index.ts
import { QUEUE_NAMES } from "#src/utils/queueManager";
import { registerWorker } from "../registry";
import { PrintingWorkerHandler } from "./handlers/printingWorkerHandler";
import { PrintingJobData } from "./types";

export const startPrintingWorker = () => {
  return registerWorker<PrintingJobData>({
    queueName: QUEUE_NAMES.PRINTING,
    concurrency: 1,
    handler: PrintingWorkerHandler.handle
  });
};
