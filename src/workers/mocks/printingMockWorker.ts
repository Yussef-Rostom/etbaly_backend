// src/workers/mocks/printingMockWorker.ts
import { Job } from "bullmq";
import { QUEUE_NAMES } from "#src/utils/queueManager";
import { registerWorker, PrintingJobData } from "../registry";
import { ManufacturingService } from "#src/modules/manufacturing/services/manufacturingAdminService";

export const startPrintingMockWorker = () => {
  return registerWorker<PrintingJobData>({
    queueName: QUEUE_NAMES.PRINTING,
    concurrency: 10, // I/O Intensive mock
    handler: async (job: Job<PrintingJobData>) => {
      const { gcodeFileKey, designId, correlationId } = job.data;
      
      console.log(`[${correlationId}] 🖨️  Picked up printing job for design ${designId}`);
      await job.updateProgress(5);

      await ManufacturingService.updateJobStatus(designId, "Printing");
      
      console.log(`[${correlationId}] 🖨️  Simulating hardware print time...`);
      await new Promise(res => setTimeout(res, 1000));
      await job.updateProgress(30);
      
      await new Promise(res => setTimeout(res, 1000));
      await job.updateProgress(60);

      await new Promise(res => setTimeout(res, 1000));
      await job.updateProgress(90);

      console.log(`[${correlationId}] 🖨️  Printing done!`);
      await ManufacturingService.updateJobStatus(designId, "Done");
      await job.updateProgress(100);

      return { 
        success: true,
        status: "printing_done"
      };
    }
  });
};
