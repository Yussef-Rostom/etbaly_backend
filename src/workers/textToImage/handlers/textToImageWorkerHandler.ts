// src/workers/textToImage/handlers/textToImageWorkerHandler.ts
import { Job } from "bullmq";
import { TextToImageJobData } from "../types";
import { TextToImageWorkerService } from "../services/textToImageWorkerService";

export class TextToImageWorkerHandler {
  static async handle(job: Job<TextToImageJobData>) {
    return TextToImageWorkerService.process(job);
  }
}
