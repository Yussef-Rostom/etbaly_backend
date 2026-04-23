// src/workers/ai/handlers/aiWorkerHandler.ts
import { Job } from "bullmq";
import { AiJobData } from "../../registry";
import { ImageTo3dWorkerService } from "../services/imageTo3dWorkerService";

export class AiWorkerHandler {
  static async handle(job: Job<AiJobData>) {
    return ImageTo3dWorkerService.process(job);
  }
}
