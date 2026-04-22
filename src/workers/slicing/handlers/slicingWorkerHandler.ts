// src/workers/slicing/handlers/slicingWorkerHandler.ts
import { Job } from "bullmq";
import { SlicingJobData } from "../types";
import { SlicingWorkerService } from "../services/slicingWorkerService";

export class SlicingWorkerHandler {
  static async handle(job: Job<SlicingJobData>) {
    return SlicingWorkerService.process(job);
  }
}
