// src/workers/slicing/services/slicingWorkerService.ts
import { Job } from "bullmq";
import { SlicingJobData } from "../types";
import { SlicingService } from "#src/modules/slicing/services/slicingService";
import { env } from "#src/configs/envConfig";
import { Material } from "#src/models/Material";
import Settings from "#src/models/Settings";
import { downloadDriveFile } from "#src/utils/drive";
import fs from "fs";
import path from "path";
import os from "os";

interface SlicingAPIResponse {
  status: string;
  original_file: string;
  gcode_file: string;
  gcode_path: string;
  preset: string;
  material: string;
  scale: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  weight: number; // Weight in grams
  print_time: number; // Print time in minutes
}

export class SlicingWorkerService {
  /**
   * Calculate price based on weight and print time
   */
  private static async calculatePrice(
    weight: number,
    printTime: number,
    materialName: string
  ): Promise<number> {
    try {
      // Get material price per gram
      const material = await Material.findOne({ 
        type: materialName.toUpperCase(),
        isActive: true 
      });
      
      const pricePerGram = material?.currentPricePerGram || 0.025; // Default to 0.025 if not found

      // Get hourly rate from settings (default to 10 per hour)
      const hourlySetting = await Settings.findOne({ key: 'PRINTING_HOURLY_RATE' });
      const hourlyRate = hourlySetting?.value ? parseFloat(hourlySetting.value) : 10;

      // Calculate material cost
      const materialCost = weight * pricePerGram;

      // Calculate time cost (printTime is in minutes)
      const timeCost = (printTime / 60) * hourlyRate;

      // Total price
      return materialCost + timeCost;
    } catch (error) {
      console.error('Error calculating price:', error);
      return 0;
    }
  }

  /**
   * Extract Google Drive file ID from various URL formats
   */
  private static extractDriveFileId(url: string): string | null {
    // Handle different Google Drive URL formats:
    // https://drive.google.com/uc?export=view&id=FILE_ID
    // https://drive.google.com/file/d/FILE_ID/view
    // https://drive.google.com/open?id=FILE_ID
    
    const patterns = [
      /[?&]id=([^&]+)/,           // ?id=FILE_ID or &id=FILE_ID
      /\/d\/([^/]+)/,              // /d/FILE_ID/
      /\/file\/d\/([^/]+)/         // /file/d/FILE_ID/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Main Slicing Worker Implementation with automatic fallback to mock on failure
   */
  static async process(job: Job<SlicingJobData>) {
    const { modelFileKey, designId, material, correlationId } = job.data;
    let tempFilePath: string | null = null;

    try {
      console.log(`[${correlationId}] ⚙️  Real slicing processing for: ${modelFileKey}`);
      await job.updateProgress(10);
      
      await SlicingService.updateSlicingJobStatus(designId, "Processing");
      await job.updateProgress(20);
      
      // Download the STL file from Google Drive
      console.log(`[${correlationId}] 📥 Downloading STL file from Google Drive...`);
      const fileId = this.extractDriveFileId(modelFileKey);
      if (!fileId) {
        throw new Error(`Failed to extract Google Drive file ID from URL: ${modelFileKey}`);
      }
      
      const fileBuffer = await downloadDriveFile(fileId);
      await job.updateProgress(30);
      
      // Save to tmp/3d directory
      const tmpDir = path.join(process.cwd(), '../tmp/3d');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      const fileName = `model-${designId}-${Date.now()}.stl`;
      tempFilePath = path.join(tmpDir, fileName);
      fs.writeFileSync(tempFilePath, fileBuffer);
      console.log(`[${correlationId}] 💾 Saved STL file to: ${tempFilePath}`);
      await job.updateProgress(40);
      
      // Call the worker server API for slicing
      const workerServerUrl = `http://${env.WORKER_SERVER_HOST}:${env.WORKER_SERVER_PORT}`;
      console.log(`[${correlationId}] 🔧 Calling worker server at: ${workerServerUrl}`);
      
      // Build request body with local file path
      const requestBody: Record<string, any> = {
        filename: fileName,  // Just the filename, worker server should access from shared tmp
        output_filename: `gcode-${designId}-${Date.now()}`,
        material: material.toLowerCase()
      };
      
      // Add optional fields if provided in job data
      if (job.data.preset) {
        requestBody.preset = job.data.preset;
      }
      if (job.data.scale !== undefined) {
        requestBody.scale = job.data.scale;
      }
      
      const response = await fetch(`${workerServerUrl}/api/slice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Worker server returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as SlicingAPIResponse;
      console.log(`[${correlationId}] ✅ Slicing completed: ${result.gcode_file}`);
      
      await job.updateProgress(70);

      // Calculate price based on weight and print time
      const calculatedPrice = await this.calculatePrice(
        result.weight,
        result.print_time,
        material
      );

      await job.updateProgress(80);

      // Update job status with the G-code URL and calculated data
      const gcodeUrl = result.gcode_path || result.gcode_file;
      await SlicingService.updateSlicingJobStatus(
        designId, 
        "Completed", 
        gcodeUrl,
        result.weight,
        result.dimensions,
        result.print_time,
        calculatedPrice
      );

      await job.updateProgress(100);
      
      // Clean up temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log(`[${correlationId}] 🗑️  Cleaned up temp file: ${tempFilePath}`);
      }
      
      return { 
        success: true, 
        gcodeFileKey: result.gcode_file,
        gcodeUrl: gcodeUrl,
        dimensions: result.dimensions,
        weight: result.weight,
        printTime: result.print_time,
        calculatedPrice: calculatedPrice,
        isMock: false
      };
    } catch (error) {
      console.error(`[${correlationId}] ⚠️  Slicing handler failed, falling back to mock:`, error);
      
      // Clean up temp file on error
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`[${correlationId}] 🗑️  Cleaned up temp file after error: ${tempFilePath}`);
        } catch (cleanupError) {
          console.error(`[${correlationId}] ⚠️  Failed to clean up temp file:`, cleanupError);
        }
      }
      
      return this.processMock(job);
    }
  }

  /**
   * Mock Slicing Worker Implementation (Fallback)
   */
  private static async processMock(job: Job<SlicingJobData>) {
    const { modelFileKey, designId, material, correlationId } = job.data;

    try {
      console.log(`[${correlationId}] 🎭 [MOCK] Slicing processing for: ${modelFileKey}`);
      await job.updateProgress(10);
      
      await SlicingService.updateSlicingJobStatus(designId, "Processing");
      await job.updateProgress(30);
      
      // Simulate CPU-intensive slicing operations
      console.log(`[${correlationId}] ⚙️  [MOCK] Running slicing algorithms for material: ${material}...`);
      const gcodeUrl = await SlicingService.simulateSlicing(modelFileKey);
      await job.updateProgress(60);

      // Generate mock data for weight, dimensions, and print time
      const mockWeight = Math.random() * 50 + 20; // Random weight between 20-70 grams
      const mockDimensions = {
        width: Math.random() * 100 + 50,  // Random width between 50-150 mm
        height: Math.random() * 100 + 50, // Random height between 50-150 mm
        depth: Math.random() * 100 + 50   // Random depth between 50-150 mm
      };
      const mockPrintTime = Math.random() * 180 + 60; // Random time between 60-240 minutes

      // Calculate price based on mock data
      const calculatedPrice = await this.calculatePrice(
        mockWeight,
        mockPrintTime,
        material
      );

      await job.updateProgress(80);

      // Finish slicing with all required data
      await SlicingService.updateSlicingJobStatus(
        designId, 
        "Completed", 
        gcodeUrl,
        mockWeight,
        mockDimensions,
        mockPrintTime,
        calculatedPrice
      );

      await job.updateProgress(100);
      return { 
        success: true, 
        gcodeFileKey: `gcode-${designId}-${Date.now()}.gcode`,
        gcodeUrl: gcodeUrl,
        dimensions: mockDimensions,
        weight: mockWeight,
        printTime: mockPrintTime,
        calculatedPrice: calculatedPrice,
        isMock: true
      };
    } catch (error) {
      console.error(`[${correlationId}] ❌ [MOCK] Slicing failed:`, error);
      
      // Update status to Failed on error
      try {
        await SlicingService.updateSlicingJobStatus(designId, "Failed");
      } catch (updateError) {
        console.error(`[${correlationId}] ❌ Failed to update job status to Failed:`, updateError);
      }
      
      throw error;
    }
  }
}


