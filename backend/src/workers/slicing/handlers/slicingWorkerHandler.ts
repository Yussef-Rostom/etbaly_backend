// src/workers/slicing/handlers/slicingWorkerHandler.ts
import { Job } from "bullmq";
import { SlicingJobData } from "../types";
import { SlicingWorkerService } from "../services/slicingWorkerService";

export class SlicingWorkerHandler {
  /**
   * Handle slicing job processing
   * @param job - BullMQ job containing slicing data
   * @returns Processing result with gcode URL and calculated metrics
   */
  static async handle(job: Job<SlicingJobData>) {
    const { jobId } = job.data;
    
    try {
      console.log(`[${jobId}] 🚀 Starting slicing job handler`);
      const result = await SlicingWorkerService.process(job);
      console.log(`[${jobId}] ✅ Slicing job completed successfully`);
      return result;
    } catch (error) {
      console.error(`[${jobId}] ❌ Slicing job handler failed:`, error);
      throw error;
    }
  }
}
