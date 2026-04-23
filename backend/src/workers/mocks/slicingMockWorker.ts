// src/workers/mocks/slicingMockWorker.ts
import { Job } from "bullmq";
import { queueManager, QUEUE_NAMES } from "#src/utils/queueManager";
import { registerWorker, SlicingJobData } from "../registry";
import { ManufacturingService } from "#src/modules/manufacturing/services/manufacturingAdminService";

export const startSlicingMockWorker = () => {
  return registerWorker<SlicingJobData>({
    queueName: QUEUE_NAMES.SLICING,
    concurrency: 4, // CPU mock simulation
    handler: async (job: Job<SlicingJobData>) => {
      const { modelFileKey, designId, material, correlationId } = job.data;

      console.log(`[${correlationId}] ⚙️  Slicing mock processing for: ${modelFileKey}`);
      await job.updateProgress(10);
      
      // We pass designId as manufacturingJobId to simulate legacy method
      await ManufacturingService.updateJobStatus(designId, "Slicing");
      await job.updateProgress(30);
      
      // Simulate CPU-intensive slicing operations
      console.log(`[${correlationId}] ⚙️  Running slicing algorithms for material: ${material}...`);
      const gcodeUrl = await ManufacturingService.simulateSlicing(modelFileKey);
      await job.updateProgress(80);

      // Finish slicing
      await ManufacturingService.updateJobStatus(designId, "Done", gcodeUrl);
      
      // 4. Job Chaining: automatically enqueue Printing job
      const gcodeFileKey = `gcode-${designId}-${Date.now()}.gcode`;
      
      console.log(`[${correlationId}] 🔗 Chaining to PRINTING queue...`);
      const printingQueue = queueManager.getQueue(QUEUE_NAMES.PRINTING);
      await printingQueue.add("print-job", {
        gcodeFileKey,
        designId,
        correlationId,
      });

      await job.updateProgress(100);
      return { 
        success: true, 
        gcodeFileKey 
      };
    }
  });
};
