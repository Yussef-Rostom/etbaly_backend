// src/workers/slicing/services/slicingWorkerService.ts
import { Job } from "bullmq";
import { queueManager, QUEUE_NAMES } from "#src/utils/queueManager";
import { SlicingJobData } from "../types";
import { ManufacturingService } from "#src/modules/manufacturing/services/manufacturingAdminService";

export class SlicingWorkerService {
  /**
   * Main Slicing Worker Implementation with automatic fallback to mock on failure
   */
  static async process(job: Job<SlicingJobData>) {
    const { modelFileKey, designId, material, correlationId } = job.data;

    try {
      console.log(`[${correlationId}] ⚙️  Real slicing processing for: ${modelFileKey}`);
      await job.updateProgress(10);
      
      await ManufacturingService.updateJobStatus(designId, "Slicing");
      await job.updateProgress(30);
      
      // Real slicing implementation would go here
      // const slicingEngine = await initializeSlicingEngine();
      // const gcodeUrl = await slicingEngine.slice(modelFileKey, material);
      
      throw new Error("Real slicing engine not implemented yet");
    } catch (error) {
      console.error(`[${correlationId}] ⚠️  Slicing handler failed, falling back to mock:`, error);
      return this.processMock(job);
    }
  }

  /**
   * Mock Slicing Worker Implementation (Fallback)
   */
  private static async processMock(job: Job<SlicingJobData>) {
    const { modelFileKey, designId, material, correlationId } = job.data;

    console.log(`[${correlationId}] 🎭 [MOCK] Slicing processing for: ${modelFileKey}`);
    await job.updateProgress(10);
    
    await ManufacturingService.updateJobStatus(designId, "Slicing");
    await job.updateProgress(30);
    
    // Simulate CPU-intensive slicing operations
    console.log(`[${correlationId}] ⚙️  [MOCK] Running slicing algorithms for material: ${material}...`);
    const gcodeUrl = await ManufacturingService.simulateSlicing(modelFileKey);
    await job.updateProgress(80);

    // Finish slicing
    await ManufacturingService.updateJobStatus(designId, "Done", gcodeUrl);
    
    // Job Chaining: automatically enqueue Printing job
    await this.chainToPrinting(designId, correlationId);

    await job.updateProgress(100);
    return { 
      success: true, 
      gcodeFileKey: `gcode-${designId}-${Date.now()}.gcode`,
      isMock: true
    };
  }

  /**
   * Chain to printing queue
   */
  private static async chainToPrinting(designId: string, correlationId: string) {
    const gcodeFileKey = `gcode-${designId}-${Date.now()}.gcode`;
    
    console.log(`[${correlationId}] 🔗 Chaining to PRINTING queue...`);
    const printingQueue = queueManager.getQueue(QUEUE_NAMES.PRINTING);
    await printingQueue.add("print-job", {
      gcodeFileKey,
      designId,
      correlationId,
    });
  }
}
