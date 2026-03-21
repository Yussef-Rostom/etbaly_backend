import { ManufacturingService } from "#src/modules/manufacturing/services/manufacturingAdminService";

export const processPrintingJob = async (data: any) => {
  const { manufacturingJobId, machineId } = data;
  try {
    console.log(`\n🖨️  [Mock Worker - Printing] Picked up job ${manufacturingJobId} for machine ${machineId}`);
    await ManufacturingService.updateJobStatus(manufacturingJobId, "Printing");
    
    console.log(`🖨️  [Mock Worker - Printing] Simulating print time...`);
    await new Promise(res => setTimeout(res, 3000));

    console.log(`🖨️  [Mock Worker - Printing] Printing done!`);
    await ManufacturingService.updateJobStatus(manufacturingJobId, "Done");
    
    console.log(`✅ [Mock Worker - Printing] Job completed successfully!\n`);
  } catch (error) {
    console.error(`❌ [Mock Worker - Printing] Job failed for ${manufacturingJobId}`, error);
    await ManufacturingService.updateJobStatus(manufacturingJobId, "Failed");
  }
};
