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

interface SlicingAPIResponse {
  status: string;
  original_file: string;
  gcode_file: string;
  gcode_path: string;
  preset: string;
  material: string;
  scale: number;
  dimensions: { width: number; height: number; depth: number };
  weight: number;
  print_time: number;
}

export interface SlicingResult {
  success: boolean;
  gcodeUrl: string;
  dimensions: { width: number; height: number; depth: number };
  weight: number;
  printTime: number;
  calculatedPrice: number;
  isMock: boolean;
}

export class SlicingWorkerService {

  private static async calculatePrice(weight: number, printTime: number, materialName: string): Promise<number> {
    try {
      const material = await Material.findOne({ type: materialName.toUpperCase(), isActive: true });
      const pricePerGram = material?.currentPricePerGram ?? 0.025;
      const hourlySetting = await Settings.findOne({ key: 'PRINTING_HOURLY_RATE' });
      const hourlyRate = hourlySetting?.value ? parseFloat(hourlySetting.value) : 10;
      return (weight * pricePerGram) + ((printTime / 60) * hourlyRate);
    } catch {
      return 0;
    }
  }

  private static extractDriveFileId(url: string): string | null {
    const patterns = [/[?&]id=([^&]+)/, /\/d\/([^/]+)/, /\/file\/d\/([^/]+)/];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  /**
   * Entry point — handles idempotency check and state transitions,
   * then delegates to processWithFallback (same pattern as AI workers).
   */
  static async process(job: Job<SlicingJobData>): Promise<SlicingResult> {
    const { designId, jobId } = job.data;

    // Idempotency check — skip if already in terminal state (BullMQ retry guard)
    const existingJob = await SlicingService.getSlicingJobById(designId);
    if (existingJob?.status === "Completed") {
      console.log(`[${jobId}] ⏭️  Already "Completed", skipping.`);
      return {
        success: true,
        gcodeUrl: existingJob.gcodeUrl ?? "",
        dimensions: existingJob.dimensions ?? { width: 0, height: 0, depth: 0 },
        weight: existingJob.weight ?? 0,
        printTime: existingJob.printTime ?? 0,
        calculatedPrice: existingJob.calculatedPrice ?? 0,
        isMock: false,
      };
    }
    if (existingJob?.status === "Failed") {
      console.log(`[${jobId}] ⏭️  Already "Failed", skipping retry.`);
      throw new Error(`SlicingJob ${designId} already in Failed state — skipping retry.`);
    }

    // Transition to Processing
    await SlicingService.updateSlicingJobStatus(designId, "Processing");
    await job.updateProgress(10);

    // Delegate to resilient processor (real → mock fallback)
    return this.processWithFallback(job);
  }

  /**
   * Attempts real worker server slicing, falls back to mock if server is unavailable.
   * Same pattern as ImageTo3dWorkerService.processWithFallback.
   */
  private static async processWithFallback(job: Job<SlicingJobData>): Promise<SlicingResult> {
    const { stlUrl, designId, material, jobId } = job.data;
    let tempFilePath: string | null = null;

    try {
      console.log(`[${jobId}] ⚙️  Real slicing for: ${stlUrl}`);

      // Download STL from Google Drive
      const fileId = this.extractDriveFileId(stlUrl);
      if (!fileId) throw new Error(`Cannot extract Drive file ID from: ${stlUrl}`);

      const fileBuffer = await downloadDriveFile(fileId);
      await job.updateProgress(30);

      // Save to tmp
      const tmpDir = path.join(process.cwd(), '../tmp/3d');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const fileName = `model-${designId}-${Date.now()}.stl`;
      tempFilePath = path.join(tmpDir, fileName);
      fs.writeFileSync(tempFilePath, fileBuffer);
      await job.updateProgress(40);

      // Call worker server
      const workerServerUrl = `http://${env.WORKER_SERVER_HOST}:${env.WORKER_SERVER_PORT}`;
      const response = await fetch(`${workerServerUrl}/api/slice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: fileName,
          output_filename: `gcode-${designId}-${Date.now()}`,
          material: material.toLowerCase(),
          ...(job.data.color && { color: job.data.color }),
          ...(job.data.preset && { preset: job.data.preset }),
          ...(job.data.scale !== undefined && { scale: job.data.scale }),
        }),
      });

      if (!response.ok) throw new Error(`Worker server ${response.status}: ${response.statusText}`);

      const result = await response.json() as SlicingAPIResponse;
      await job.updateProgress(70);

      const calculatedPrice = await this.calculatePrice(result.weight, result.print_time, material);
      const gcodeUrl = result.gcode_path || result.gcode_file;

      await SlicingService.updateSlicingJobStatus(designId, "Completed", gcodeUrl, result.weight, result.dimensions, result.print_time, calculatedPrice);
      await job.updateProgress(100);

      if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

      return { success: true, gcodeUrl, dimensions: result.dimensions, weight: result.weight, printTime: result.print_time, calculatedPrice, isMock: false };

    } catch (error: any) {
      console.error(`[${jobId}] ⚠️  Worker server failed, falling back to mock: ${error.message}`);

      // Cleanup temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch {}
      }

      // Fallback to mock
      return this.processMock(job);
    }
  }

  /**
   * Mock fallback — generates dummy slicing data when worker server is unavailable.
   */
  private static async processMock(job: Job<SlicingJobData>): Promise<SlicingResult> {
    const { stlUrl, designId, material, jobId } = job.data;

    try {
      console.log(`[${jobId}] 🎭 [MOCK] Slicing for: ${stlUrl}`);

      const gcodeUrl = await SlicingService.simulateSlicing(stlUrl);
      await job.updateProgress(60);

      const mockWeight = Math.floor(Math.random() * 50 + 20);
      const mockDimensions = {
        width:  Math.floor(Math.random() * 100 + 50),
        height: Math.floor(Math.random() * 100 + 50),
        depth:  Math.floor(Math.random() * 100 + 50),
      };
      const mockPrintTime = Math.floor(Math.random() * 180 + 60);
      const calculatedPrice = await this.calculatePrice(mockWeight, mockPrintTime, material);

      await job.updateProgress(80);

      await SlicingService.updateSlicingJobStatus(designId, "Completed", gcodeUrl, mockWeight, mockDimensions, mockPrintTime, calculatedPrice);
      await job.updateProgress(100);

      return { success: true, gcodeUrl, dimensions: mockDimensions, weight: mockWeight, printTime: mockPrintTime, calculatedPrice, isMock: true };

    } catch (error) {
      console.error(`[${jobId}] ❌ [MOCK] Slicing failed:`, error);
      try {
        await SlicingService.updateSlicingJobStatus(designId, "Failed");
      } catch (updateError) {
        console.error(`[${jobId}] ❌ Failed to update status to Failed:`, updateError);
      }
      throw error;
    }
  }
}
