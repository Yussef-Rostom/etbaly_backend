// src/workers/printing/handlers/printingWorkerHandler.ts
import { Job } from "bullmq";
import { PrintingJobData } from "../types";
import { PrintingWorkerService } from "../services/printingWorkerService";

export class PrintingWorkerHandler {
  static async handle(job: Job<PrintingJobData>) {
    return PrintingWorkerService.process(job);
  }
}
