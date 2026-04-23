// src/workers/mocks/aiMockWorker.ts
import { Job } from "bullmq";
import { QUEUE_NAMES } from "#src/utils/queueManager";
import { registerWorker, AiJobData } from "../registry";

export const startAiMockWorker = () => {
  return registerWorker<AiJobData>({
    queueName: QUEUE_NAMES.AI_GENERATION,
    concurrency: 2,
    handler: async (job: Job<AiJobData>) => {
      const { fileId, designName, ownerId, correlationId } = job.data;
      
      // 1. Download file content from Google Drive using fileId
      console.log(`[${correlationId}] 📥 Downloading file ${fileId} from Google Drive...`);
      // const imageBuffer = await downloadDriveFile(fileId);

      // 2. Fetch Lightning AI URL from DB and send to AI Service
      console.log(`[${correlationId}] 📤 Sending image to Lightning AI service...`);
      // const stlBuffer = await callLightningService(imageBuffer);

      // 3. Upload Resulting STL back to Google Drive
      console.log(`[${correlationId}] ☁️  Storing resulting STL model...`);
      // const { fileId: modelFileId, publicUrl } = await uploadSTLFile(stlBuffer);

      // 4. Create Design record in database
      console.log(`[${correlationId}] 📝 Creating Design document for owner: ${ownerId}...`);
      
      return {
        success: true,
        designId: "mock-design-id",
        fileId: "mock-stl-file-id"
      };
    }
  });
};
