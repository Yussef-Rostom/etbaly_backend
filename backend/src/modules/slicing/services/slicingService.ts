import { SlicingJob, ISlicingJob } from "#src/models/SlicingJob";
import mongoose from "mongoose";
import { AppError } from "#src/utils/AppError";

export interface CreateSlicingJobInput {
  designId: mongoose.Types.ObjectId;
  targetOrderItemId?: mongoose.Types.ObjectId;
  stlFileUrl?: string;
  fileName?: string;
  orderId?: mongoose.Types.ObjectId;
  operatorId?: mongoose.Types.ObjectId;
}

export interface SlicingJobFilters {
  status?: "Queued" | "Processing" | "Completed" | "Failed";
  designId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  operatorId?: mongoose.Types.ObjectId;
}

export type SlicingJobStatus = "Queued" | "Processing" | "Completed" | "Failed";

export class SlicingService {
  /**
   * Creates a new SlicingJob document
   * 
   * @param data - The data for creating a slicing job
   * @returns The created SlicingJob document
   * @throws AppError if validation fails
   */
  static async createSlicingJob(data: CreateSlicingJobInput): Promise<ISlicingJob> {
    try {
      const slicingJob = new SlicingJob({
        ...data,
        status: "Queued",
      });

      await slicingJob.save();
      return slicingJob;
    } catch (error: any) {
      if (error.name === "ValidationError") {
        throw new AppError(error.message, 400);
      }
      throw error;
    }
  }

  /**
   * Updates SlicingJob status with validation
   * Sets finishedAt timestamp for "Completed" and "Failed" statuses
   * 
   * @param jobId - The MongoDB ObjectId of the job
   * @param status - The new status
   * @param gcodeUrl - Optional G-code URL (typically set when status is "Completed")
   * @param weight - Required weight in grams for Completed status
   * @param dimensions - Required dimensions object for Completed status
   * @param printTime - Required print time in minutes for Completed status
   * @param calculatedPrice - Required calculated price for Completed status
   * @returns The updated SlicingJob document
   * @throws AppError if job not found or validation fails
   */
  static async updateSlicingJobStatus(
    jobId: string,
    status: SlicingJobStatus,
    gcodeUrl?: string,
    weight?: number,
    dimensions?: { width: number; height: number; depth: number },
    printTime?: number,
    calculatedPrice?: number
  ): Promise<ISlicingJob> {
    const job = await SlicingJob.findById(jobId);
    
    if (!job) {
      throw new AppError("SlicingJob not found", 404);
    }

    // Validate state transitions
    const validTransitions: Record<SlicingJobStatus, SlicingJobStatus[]> = {
      Queued: ["Processing"],
      Processing: ["Completed", "Failed"],
      Completed: [],
      Failed: [],
    };

    const allowedNextStates = validTransitions[job.status];
    if (!allowedNextStates.includes(status)) {
      throw new AppError(
        `Invalid status transition. Job must be in '${allowedNextStates.length > 0 ? allowedNextStates.join("' or '") : "no valid state"}' status.`,
        400
      );
    }

    // Validate required fields for Completed status
    if (status === "Completed") {
      if (!weight || !dimensions || !printTime || calculatedPrice === undefined) {
        throw new AppError(
          "Weight, dimensions, printTime, and calculatedPrice are required when completing a slicing job",
          400
        );
      }
    }

    // Build update data
    const updateData: any = { status };

    // Set finishedAt for terminal states
    if (status === "Completed" || status === "Failed") {
      updateData.finishedAt = new Date();
    }

    // Set startedAt when transitioning to Processing
    if (status === "Processing") {
      updateData.startedAt = new Date();
    }

    // Set gcodeUrl if provided
    if (gcodeUrl) {
      updateData.gcodeUrl = gcodeUrl;
    }

    // Set weight if provided
    if (weight !== undefined) {
      updateData.weight = weight;
    }

    // Set dimensions if provided
    if (dimensions) {
      updateData.dimensions = dimensions;
    }

    // Set printTime if provided
    if (printTime !== undefined) {
      updateData.printTime = printTime;
    }

    // Set calculatedPrice if provided
    if (calculatedPrice !== undefined) {
      updateData.calculatedPrice = calculatedPrice;
    }

    const updatedJob = await SlicingJob.findByIdAndUpdate(
      jobId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedJob) {
      throw new AppError("SlicingJob not found", 404);
    }

    return updatedJob;
  }

  /**
   * Retrieves a SlicingJob by ID
   * 
   * @param jobId - The MongoDB ObjectId of the job
   * @returns The SlicingJob document or null if not found
   */
  static async getSlicingJobById(jobId: string): Promise<ISlicingJob | null> {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return null;
    }
    
    return await SlicingJob.findById(jobId);
  }

  /**
   * Lists SlicingJobs with optional filters
   * 
   * @param filters - Optional filters for querying slicing jobs
   * @returns Array of SlicingJob documents matching the filters
   */
  static async listSlicingJobs(filters: SlicingJobFilters = {}): Promise<ISlicingJob[]> {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.designId) {
      query.designId = filters.designId;
    }

    if (filters.orderId) {
      query.orderId = filters.orderId;
    }

    if (filters.operatorId) {
      query.operatorId = filters.operatorId;
    }

    return await SlicingJob.find(query).sort({ createdAt: -1 });
  }

  /**
   * Simulates slicing process for 5 seconds.
   * Replace this with actual PrusaSlicer/child_process calls in production.
   * 
   * @param fileName - The original 3D file name to define the output URL
   * @returns Resolves the dummy gcode string url
   */
  static async simulateSlicing(fileName: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const gcodeUrl = `https://storage.etb3haly.com/gcode/${Date.now()}_${fileName.replace(/\.\w+$/, ".gcode")}`;
        resolve(gcodeUrl);
      }, 5_000);
    });
  }
}
