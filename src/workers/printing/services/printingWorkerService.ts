// src/workers/printing/services/printingWorkerService.ts
import { Job } from "bullmq";
import { PrintingJobData } from "../types";
import { ManufacturingService } from "#src/modules/manufacturing/services/manufacturingAdminService";

export class PrintingWorkerService {
  /**
   * Main Printing Worker Implementation with automatic fallback to mock on failure
   */
  static async process(job: Job<PrintingJobData>) {
    const { gcodeFileKey, designId, correlationId } = job.data;
    
    try {
      console.log(`[${correlationId}] 🖨️  Real printing job for design ${designId}`);
      await job.updateProgress(5);

      await ManufacturingService.updateJobStatus(designId, "Printing");
      
      // Real printer integration would go here
      // const printer = await connectToPrinter();
      // await printer.sendGcode(gcodeFileKey);
      // await printer.waitForCompletion();
      
      throw new Error("Real printer hardware not connected");
    } catch (error) {
      console.error(`[${correlationId}] ⚠️  Printing handler failed, falling back to mock:`, error);
      return this.processMock(job);
    }
  }

  /**
   * Mock Printing Worker Implementation (Fallback)
   */
  private static async processMock(job: Job<PrintingJobData>) {
    const { gcodeFileKey, designId, correlationId } = job.data;
    
    console.log(`[${correlationId}] 🎭 [MOCK] Printing job for design ${designId}`);
    await job.updateProgress(5);

    await ManufacturingService.updateJobStatus(designId, "Printing");
    
    console.log(`[${correlationId}] 🖨️  [MOCK] Simulating hardware print time...`);
    await this.simulatePrintProgress(job, correlationId);

    console.log(`[${correlationId}] 🖨️  [MOCK] Printing done!`);
    await ManufacturingService.updateJobStatus(designId, "Done");
    await job.updateProgress(100);

    return { 
      success: true,
      status: "printing_done",
      isMock: true
    };
  }

  /**
   * Simulate print progress
   */
  private static async simulatePrintProgress(job: Job<PrintingJobData>, correlationId: string) {
    const stages = [
      { progress: 30, delay: 1000 },
      { progress: 60, delay: 1000 },
      { progress: 90, delay: 1000 }
    ];

    for (const stage of stages) {
      await new Promise(res => setTimeout(res, stage.delay));
      await job.updateProgress(stage.progress);
    }
  }
}
