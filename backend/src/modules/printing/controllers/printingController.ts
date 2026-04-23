import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { PrintingService } from "#src/modules/printing/services/printingService";
import { SlicingService } from "#src/modules/slicing/services/slicingService";
import { AppError } from "#src/utils/AppError";
import mongoose from "mongoose";

export class PrintingController {
  /**
   * @desc    Create a printing job from a completed slicing job
   * @route   POST /api/v1/printing/execute
   * @access  Authenticated Users
   */
  public static createPrintingJob = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { slicingJobId } = req.body;
      const ownerId = (req.user as any)?.id || (req.user as any)?._id?.toString() || "system";

      // Fetch the slicing job
      const slicingJob = await SlicingService.getSlicingJobById(slicingJobId);
      
      if (!slicingJob) {
        throw new AppError("Slicing job not found", 404);
      }

      // Validate that slicing job is completed
      if (slicingJob.status !== "Completed") {
        throw new AppError(
          `Slicing job must be completed before creating a printing job. Current status: ${slicingJob.status}`,
          400
        );
      }

      // Validate that gcodeUrl exists
      if (!slicingJob.gcodeUrl) {
        throw new AppError("Slicing job does not have a G-code URL", 400);
      }

      // Generate unique job number
      const jobNumber = `PRINT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create PrintingJob document with status "Pending Review"
      const printingJob = await PrintingService.createPrintingJob({
        jobNumber,
        slicingJobId: new mongoose.Types.ObjectId(slicingJobId),
        fileName: slicingJob.fileName || `gcode_${jobNumber}.gcode`,
        gcodeUrl: slicingJob.gcodeUrl,
        operatorId: new mongoose.Types.ObjectId(ownerId),
      });

      sendSuccess(res, 200, "PrintingJob created successfully. Awaiting review.", {
        jobId: printingJob._id,
        jobNumber: printingJob.jobNumber,
        status: printingJob.status,
        slicingJobId: slicingJob._id,
        gcodeUrl: slicingJob.gcodeUrl,
      });
    }
  );

  /**
   * @desc    Review a printing job (approve/reject)
   * @route   POST /api/v1/admin/printing/review
   * @access  Admin only
   */
  public static reviewPrintingJob = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { jobId, action } = req.body;

      const updatedJob = await PrintingService.reviewPrintingJob(jobId, action);

      const message = action === "approve" 
        ? "PrintingJob approved successfully." 
        : "PrintingJob rejected successfully.";

      sendSuccess(res, 200, message, {
        jobId: updatedJob._id,
        jobNumber: updatedJob.jobNumber,
        status: updatedJob.status,
      });
    }
  );

  /**
   * @desc    Get queued printing jobs
   * @route   GET /api/v1/admin/printing/queued
   * @access  Admin only
   */
  public static getQueuedJobs = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const jobs = await PrintingService.getQueuedPrintingJobs();

      sendSuccess(res, 200, "Queued printing jobs retrieved successfully.", {
        jobs,
      });
    }
  );

  /**
   * @desc    Manually start a printing job
   * @route   POST /api/v1/admin/printing/start
   * @access  Admin only
   */
  public static startPrintingJob = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { jobId, machineId } = req.body;

      const updatedJob = await PrintingService.startPrintingJob(jobId, machineId);

      sendSuccess(res, 200, "PrintingJob started successfully.", {
        jobId: updatedJob._id,
        jobNumber: updatedJob.jobNumber,
        status: updatedJob.status,
        machineId: updatedJob.machineId,
        startedAt: updatedJob.startedAt,
        gcodeUrl: updatedJob.gcodeUrl,
      });
    }
  );

  /**
   * @desc    Manually complete a printing job
   * @route   POST /api/v1/admin/printing/complete
   * @access  Admin only
   */
  public static completePrintingJob = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { jobId } = req.body;

      const updatedJob = await PrintingService.completePrintingJob(jobId);

      sendSuccess(res, 200, "PrintingJob completed successfully.", {
        jobId: updatedJob._id,
        jobNumber: updatedJob.jobNumber,
        status: updatedJob.status,
        finishedAt: updatedJob.finishedAt,
      });
    }
  );

  /**
   * @desc    Manually fail a printing job
   * @route   POST /api/v1/admin/printing/fail
   * @access  Admin only
   */
  public static failPrintingJob = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { jobId, reason } = req.body;

      const updatedJob = await PrintingService.failPrintingJob(jobId, reason);

      sendSuccess(res, 200, "PrintingJob marked as failed.", {
        jobId: updatedJob._id,
        jobNumber: updatedJob.jobNumber,
        status: updatedJob.status,
        finishedAt: updatedJob.finishedAt,
      });
    }
  );

  /**
   * @desc    Get the status of a printing job
   * @route   GET /api/v1/admin/printing/status/:jobId
   * @access  Admin or Operator
   */
  public static getPrintingJobStatus = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const jobId = req.params.jobId as string;

      const printingJob = await PrintingService.getPrintingJobById(jobId);

      if (!printingJob) {
        sendSuccess(res, 404, "PrintingJob not found.", null);
        return;
      }

      sendSuccess(res, 200, "PrintingJob status retrieved successfully.", {
        jobId: printingJob._id,
        jobNumber: printingJob.jobNumber,
        status: printingJob.status,
        gcodeUrl: printingJob.gcodeUrl,
        machineId: printingJob.machineId,
        fileName: printingJob.fileName,
        startedAt: printingJob.startedAt,
        finishedAt: printingJob.finishedAt,
        createdAt: printingJob.createdAt,
        updatedAt: printingJob.updatedAt,
      });
    }
  );
}
