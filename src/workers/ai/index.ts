// src/workers/ai/index.ts
import { QUEUE_NAMES } from "#src/utils/queueManager";
import { registerWorker, AiJobData } from "../registry";
import { AiWorkerHandler } from "./handlers/aiWorkerHandler";

export const startAiWorker = () => {
  return registerWorker<AiJobData>({
    queueName: QUEUE_NAMES.AI_GENERATION,
    concurrency: 1,
    handler: AiWorkerHandler.handle
  });
};
