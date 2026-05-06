import { PrintingJob, IPrintingJob } from "#src/models/PrintingJob";
import { Order } from "#src/models/Order";
import mongoose from "mongoose";
import { AppError } from "#src/utils/AppError";

export interface CreatePrintingJobInput {
  slicingJobId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  orderItemId: mongoose.Types.ObjectId;
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
   * Retrieves PrintingJobs with optional status filtering, pagination, and sorting
   * 
   * @param queryStr - Query parameters for filtering, sorting, and pagination
   * @returns Object with jobs array and total count
   */
  static async getQueuedPrintingJobs(queryStr: Record<string, any>): Promise<{ jobs: IPrintingJob[]; total: number }> {
    // Default to Queued status if not specified
    const baseFilter: any = {};
    if (!queryStr.status) {
      baseFilter.status = "Queued";
    }
    
    const features = new (await import("#src/utils/apiFeatures")).APIFeatures(
      PrintingJob.find(baseFilter),
      queryStr
    )
      .filter()
      .sort();

    // Only apply pagination if limit is explicitly provided
    if (queryStr.limit || queryStr.page) {
      features.paginate();
    }

    const countFeatures = new (await import("#src/utils/apiFeatures")).APIFeatures(
      PrintingJob.find(baseFilter),
      queryStr
    ).filter();

    const [jobs, total] = await Promise.all([
      features.query,
      countFeatures.query.countDocuments(),
    ]);

    return { jobs, total };
  }

  /**
   * Manually starts a PrintingJob.
   * Transitions from "Queued" to "Processing", sets startedAt,
   * and updates the linked order item status to "Printing".
   */
  static async startPrintingJob(
    jobId: string,
    machineId?: string
  ): Promise<IPrintingJob> {
    const job = await PrintingJob.findById(jobId);
    
    if (!job) {
      throw new AppError("PrintingJob not found", 404);
    }

    if (job.status !== "Queued") {
      throw new AppError(
        "Invalid status transition. Job must be in 'Queued' status.",
        400
      );
    }

    const updateData: any = { status: "Processing", startedAt: new Date() };
    if (machineId) updateData.machineId = machineId;

    const updatedJob = await PrintingJob.findByIdAndUpdate(
      jobId,
      updateData,
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedJob) {
      throw new AppError("PrintingJob not found", 404);
    }

    // Update the linked order item status to "Printing"
    await Order.updateOne(
      { _id: job.orderId, "items._id": job.orderItemId } as any,
      { $set: { "items.$.status": "Printing" } },
    );

    return updatedJob;
  }

  /**
   * Manually completes a PrintingJob.
   * Transitions from "Processing" to "Completed", sets finishedAt,
   * and updates the linked order item status to "Ready".
   */
  static async completePrintingJob(jobId: string): Promise<IPrintingJob> {
    const job = await PrintingJob.findById(jobId);
    
    if (!job) {
      throw new AppError("PrintingJob not found", 404);
    }

    if (job.status !== "Processing") {
      throw new AppError(
        "Invalid status transition. Job must be in 'Processing' status.",
        400
      );
    }

    const updatedJob = await PrintingJob.findByIdAndUpdate(
      jobId,
      { status: "Completed", finishedAt: new Date() },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedJob) {
      throw new AppError("PrintingJob not found", 404);
    }

    // Update the linked order item status to "Ready"
    await Order.updateOne(
      { _id: job.orderId, "items._id": job.orderItemId } as any,
      { $set: { "items.$.status": "Ready" } },
    );

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
  static async failPrintingJob(jobId: string): Promise<IPrintingJob> {
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
   * Retrieves a PrintingJob by ID with full population:
   * slicingJobId → stlFileUrl, gcodeUrl, material, color, preset, scale, weight, dimensions, printTime, calculatedPrice
   * orderId → order status and shipping info
   * operatorId → operator name/email
   */
  static async getJobById(jobId: string): Promise<any | null> {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return null;
    }

    return PrintingJob.findById(jobId)
      .populate("slicingJobId", "stlFileUrl gcodeUrl material color preset scale weight dimensions printTime calculatedPrice fileName designId status")
      .populate("orderId", "status shippingAddressSnapshot pricingSummary userId")
      .populate("operatorId", "profile.firstName profile.lastName email")
      .lean();
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
