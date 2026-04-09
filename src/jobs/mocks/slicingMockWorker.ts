import { ManufacturingService } from "#src/modules/manufacturing/services/manufacturingAdminService";
import { ProductAdminService } from "#src/modules/product/services/productAdminService";

export const processSlicingJob = async (data: any) => {
  const { manufacturingJobId, fileName, productId } = data;
  try {
    console.log(`\n⚙️  [Mock Worker - Slicing] Picked up job for: ${fileName}`);
    await ManufacturingService.updateJobStatus(manufacturingJobId, "Slicing");
    
    console.log(`⚙️  [Mock Worker - Slicing] Slicing in progress...`);
    const gcodeUrl = await ManufacturingService.simulateSlicing(fileName);

    console.log(`⚙️  [Mock Worker - Slicing] Slicing done!`);
    await ManufacturingService.updateJobStatus(manufacturingJobId, "Done", gcodeUrl);
    
    // Update product if this is a product-linked job
    if (productId) {
      await ProductAdminService.updateProductGcode(productId, gcodeUrl);
      console.log(`✅ [Mock Worker - Slicing] Product ${productId} updated with G-code URL`);
    }
    
    console.log(`✅ [Mock Worker - Slicing] Job completed successfully! G-code: ${gcodeUrl}\n`);
  } catch (error) {
    console.error(`❌ [Mock Worker - Slicing] Job failed for ${fileName}`, error);
    await ManufacturingService.updateJobStatus(manufacturingJobId, "Failed");
  }
};
