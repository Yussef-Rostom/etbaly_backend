// src/workers/textToImage/index.ts
import { QUEUE_NAMES } from "#src/utils/queueManager";
import { registerWorker } from "../registry";
import { TextToImageWorkerHandler } from "./handlers/textToImageWorkerHandler";
import { TextToImageJobData } from "./types";

export const startTextToImageWorker = () => {
  return registerWorker<TextToImageJobData>({
    queueName: QUEUE_NAMES.TEXT_TO_IMAGE,
    concurrency: 1,
    handler: TextToImageWorkerHandler.handle
  });
};
