import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";
import mongoose from "mongoose";
import { AiAdminService } from "#src/modules/ai/services/aiAdminService";
import { uploadImage } from "#src/utils/drive";
import { Design } from "#src/models/Design";
import { Upload } from "#src/models/Upload";
import { AppError } from "#src/utils/AppError";

interface AiJobData {
  imageBuffer: Buffer;
  imageName: string;
  designName: string;
  ownerId: string;
  mimeType?: string;
}

/**
 * Extracts the Drive file ID from a Google Drive URL
 */
function extractDriveFileId(fileUrl: string): string | null {
  try {
    return new URL(fileUrl).searchParams.get("id");
  } catch {
    return null;
  }
}

/**
 * Process AI generation job: Convert image to STL using Lightning AI service
 */
export const processAiGenerationJob = async (data: AiJobData) => {
  const { imageBuffer, imageName, designName, ownerId, mimeType = "image/jpeg" } = data;

  try {
    console.log(`\n🤖 [AI Worker] Starting AI generation for: ${designName}`);
    
    // Step 1: Get Lightning AI service URL from database
    console.log(`🔍 [AI Worker] Fetching Lightning AI service URL...`);
    const lightningUrl = await AiAdminService.getLightningUrl();
    
    if (!lightningUrl) {
      throw new AppError("Lightning AI service URL is not configured. Please set it via admin API.", 500);
    }
    
    console.log(`✅ [AI Worker] Lightning URL: ${lightningUrl}`);

    // Step 2: Prepare form data with image file
    console.log(`📤 [AI Worker] Sending image to Lightning AI service...`);
    const formData = new FormData();
    formData.append("image", imageBuffer, {
      filename: imageName,
      contentType: mimeType,
    });

    // Step 3: Call Lightning AI service
    const response = await axios.post(lightningUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      responseType: "arraybuffer", // Expect binary STL file
      timeout: 120000, // 2 minute timeout for AI processing
    });

    if (response.status !== 200) {
      throw new AppError(`Lightning AI service returned status ${response.status}`, 500);
    }

    console.log(`✅ [AI Worker] Received STL file from Lightning AI service`);

    // Step 4: Upload STL file to Google Drive
    console.log(`☁️  [AI Worker] Uploading STL to Google Drive...`);
    const stlBuffer = Buffer.from(response.data);
    const stlFileName = `${designName.replace(/\s+/g, "_")}_${Date.now()}.stl`;
    
    const fileUrl = await uploadImage(stlBuffer, stlFileName, "model/stl");
    console.log(`✅ [AI Worker] STL uploaded to Drive: ${fileUrl}`);

    // Step 5: Track upload in database
    const driveFileId = extractDriveFileId(fileUrl);
    if (driveFileId) {
      await Upload.findOneAndUpdate(
        { driveFileId },
        { driveFileId, fileUrl, isUsed: false },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    // Step 6: Create Design document
    console.log(`📝 [AI Worker] Creating design document...`);
    const design = await Design.create({
      name: designName,
      isPrintable: true, // AI-generated designs are printable by default
      metadata: {
        supportedMaterials: ["PLA", "ABS", "PETG"], // Default materials for AI-generated designs
      },
      ownerId: new mongoose.Types.ObjectId(ownerId),
      fileUrl,
    });

    // Mark upload as used
    if (driveFileId) {
      await Upload.findOneAndUpdate({ driveFileId }, { isUsed: true });
    }

    console.log(`✅ [AI Worker] Design created successfully! ID: ${design._id}`);
    console.log(`🎉 [AI Worker] AI generation job completed!\n`);

    return {
      success: true,
      designId: design._id.toString(),
      fileUrl,
    };
  } catch (error) {
    console.error(`❌ [AI Worker] Job failed for ${designName}:`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        throw new AppError("Cannot connect to Lightning AI service. Please check the URL.", 500);
      } else if (error.code === "ETIMEDOUT") {
        throw new AppError("Lightning AI service request timed out.", 500);
      } else if (error.response) {
        throw new AppError(
          `Lightning AI service error: ${error.response.status} - ${error.response.statusText}`,
          500
        );
      }
    }
    
    throw error;
  }
};
