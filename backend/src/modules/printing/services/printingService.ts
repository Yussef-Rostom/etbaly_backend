import { PrintingJob, IPrintingJob } from "#src/models/PrintingJob";
import mongoose from "mongoose";
import { AppError } from "#src/utils/AppError";

export interface CreatePrintingJobInput {
  slicingJobId: mongoose.Types.ObjectId;
  gcodeUrl: string;
  fileName: string;
  operatorId?: mongoose.Types.ObjectId;
}

export interface PrintingJobFilters {
  status?: "Pending Review" | "Approved" | "Rejected" | "Queued" | "Processing" | "Completed" | "Failed";
  productId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  operatorId?: mongoose.Types.ObjectId;
}

export type PrintingJobStatus = "Pending Review" | "Approved" | "Rejected" | "Queued" | "Processing" | "Completed" | "Failed";

export class PrintingService {
  /**
   * Creates a new PrintingJob document with "Pending Review" status
   * 
   * @param data - The data for creating a printing job
   * @returns The created PrintingJob document
   * @throws AppError if validation fails
   */
  static async createPrintingJob(data: CreatePrintingJobInput): Promise<IPrintingJob> {
    try {
      const printingJob = new PrintingJob({
        ...data,
        status: "Pending Review",
      });

      await printingJob.save();
      return printingJob;
    } catch (error: any) {
      if (error.name === "ValidationError") {
        throw new AppError(error.message, 400);
      }
      throw error;
    }
  }

  /**
   * Reviews a PrintingJob and approves or rejects it
   * - If approved: status transitions to "Approved" then automatically to "Queued"
   * - If rejected: status transitions to "Rejected" (terminal state)
   * 
   * @param jobId - The MongoDB ObjectId of the job
   * @param action - The review decision ("approve" or "reject")
   * @returns The updated PrintingJob document
   * @throws AppError if job not found or validation fails
   */
  static async reviewPrintingJob(
    jobId: string,
    action: "approve" | "reject"
  ): Promise<IPrintingJob> {
    const job = await PrintingJob.findById(jobId);
    
    if (!job) {
      throw new AppError("PrintingJob not found", 404);
    }

    // Validate current status
    if (job.status !== "Pending Review") {
      throw new AppError(
        "Invalid status transition. Job must be in 'Pending Review' status.",
        400
      );
    }

    // Determine target status
    const targetStatus = action === "approve" ? "Queued" : "Rejected";

    const updatedJob = await PrintingJob.findByIdAndUpdate(
      jobId,
      { status: targetStatus },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedJob) {
      throw new AppError("PrintingJob not found", 404);
    }

    return updatedJob;
  }

  /**
   * Retrieves queued PrintingJobs
   * 
   * @returns Array of PrintingJob documents with status "Queued"
   */
  static async getQueuedPrintingJobs(): Promise<IPrintingJob[]> {
    return await PrintingJob.find({ status: "Queued" }).sort({ createdAt: -1 });
  }

  /**
   * Manually starts a PrintingJob
   * Transitions from "Queued" to "Processing" and sets startedAt timestamp
   * 
   * @param jobId - The MongoDB ObjectId of the job
   * @param machineId - Optional 3D printer identifier
   * @returns The updated PrintingJob document
   * @throws AppError if job not found or validation fails
   */
  static async startPrintingJob(
    jobId: string,
    machineId?: string
  ): Promise<IPrintingJob> {
    const job = await PrintingJob.findById(jobId);
    
    if (!job) {
      throw new AppError("PrintingJob not found", 404);
    }

    // Validate current status
    if (job.status !== "Queued") {
      throw new AppError(
        "Invalid status transition. Job must be in 'Queued' status.",
        400
      );
    }

    // Build update data
    const updateData: any = {
      status: "Processing",
      startedAt: new Date(),
    };

    if (machineId) {
      updateData.machineId = machineId;
    }

    const updatedJob = await PrintingJob.findByIdAndUpdate(
      jobId,
      updateData,
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedJob) {
      throw new AppError("PrintingJob not found", 404);
    }

    return updatedJob;
  }

  /**
   * Manually completes a PrintingJob
   * Transitions from "Processing" to "Completed" and sets finishedAt timestamp
   * 
   * @param jobId - The MongoDB ObjectId of the job
   * @returns The updated PrintingJob document
   * @throws AppError if job not found or validation fails
   */
  static async completePrintingJob(jobId: string): Promise<IPrintingJob> {
    const job = await PrintingJob.findById(jobId);
    
    if (!job) {
      throw new AppError("PrintingJob not found", 404);
    }

    // Validate current status
    if (job.status !== "Processing") {
      throw new AppError(
        "Invalid status transition. Job must be in 'Processing' status.",
        400
      );
    }

    const updatedJob = await PrintingJob.findByIdAndUpdate(
      jobId,
      {
        status: "Completed",
        finishedAt: new Date(),
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedJob) {
      throw new AppError("PrintingJob not found", 404);
    }

    return updatedJob;
  }

  /**
   * Manually fails a PrintingJob
   * Transitions from "Processing" to "Failed" and sets finishedAt timestamp
   * 
   * @param jobId - The MongoDB ObjectId of the job
   * @param reason - Optional reason for failure
   * @returns The updated PrintingJob document
   * @throws AppError if job not found or validation fails
   */
  static async failPrintingJob(
    jobId: string,
    reason?: string
  ): Promise<IPrintingJob> {
    const job = await PrintingJob.findById(jobId);
    
    if (!job) {
      throw new AppError("PrintingJob not found", 404);
    }

    // Validate current status
    if (job.status !== "Processing") {
      throw new AppError(
        "Invalid status transition. Job must be in 'Processing' status.",
        400
      );
    }

    const updatedJob = await PrintingJob.findByIdAndUpdate(
      jobId,
      {
        status: "Failed",
        finishedAt: new Date(),
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedJob) {
      throw new AppError("PrintingJob not found", 404);
    }

    return updatedJob;
  }

  /**
   * Retrieves a PrintingJob by ID
   * 
   * @param jobId - The MongoDB ObjectId of the job
   * @returns The PrintingJob document or null if not found
   */
  static async getPrintingJobById(jobId: string): Promise<IPrintingJob | null> {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return null;
    }
    
    return await PrintingJob.findById(jobId);
  }

  /**
   * Lists PrintingJobs with optional filters
   * 
   * @param filters - Optional filters for querying printing jobs
   * @returns Array of PrintingJob documents matching the filters
   */
  static async listPrintingJobs(filters: PrintingJobFilters = {}): Promise<IPrintingJob[]> {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.productId) {
      query.productId = filters.productId;
    }

    if (filters.orderId) {
      query.orderId = filters.orderId;
    }

    if (filters.operatorId) {
      query.operatorId = filters.operatorId;
    }

    return await PrintingJob.find(query).sort({ createdAt: -1 });
  }
}
