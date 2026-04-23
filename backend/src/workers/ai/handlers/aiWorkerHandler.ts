// src/workers/ai/handlers/aiWorkerHandler.ts
import { Job } from "bullmq";
import { AiJobData } from "../../registry";
import { AiWorkerService } from "../services/aiWorkerService";

export class AiWorkerHandler {
  static async handle(job: Job<AiJobData>) {
    return AiWorkerService.process(job);
  }
}
