import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { PrintingService } from "#src/modules/printing/services/printingService";

export class PrintingController {
  /**
   * @desc    Review a printing job (approve/reject)
   * @route   POST /api/v1/printing/review
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
        status: updatedJob.status,
      });
    },
  );

  /**
   * @desc    Queue an approved printing job
   * @route   POST /api/v1/printing/queue
   * @access  Admin only
   */
  public static queuePrintingJob = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { jobId } = req.body;

      const updatedJob = await PrintingService.queuePrintingJob(jobId);

      sendSuccess(res, 200, "PrintingJob queued successfully.", {
        jobId: updatedJob._id,
        status: updatedJob.status,
      });
    },
  );

  /**
   * @desc    Get printing jobs with optional status filtering and pagination
   * @route   GET /api/v1/printing/jobs
   * @access  Admin only
   */
  public static getQueuedJobs = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { jobs, total } = await PrintingService.getQueuedPrintingJobs(req.query);

      sendSuccess(res, 200, "Printing jobs retrieved successfully.", {
        total,
        results: jobs.length,
        jobs,
      });
    },
  );

  /**
   * @desc    Manually start a printing job
   * @route   POST /api/v1/printing/start
   * @access  Admin only
   */
  public static startPrintingJob = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { jobId, machineId } = req.body;

      const updatedJob = await PrintingService.startPrintingJob(jobId, machineId);

      sendSuccess(res, 200, "PrintingJob started successfully.", {
        jobId: updatedJob._id,
        status: updatedJob.status,
        machineId: updatedJob.machineId,
        startedAt: updatedJob.startedAt,
        gcodeUrl: updatedJob.gcodeUrl,
      });
    },
  );

  /**
   * @desc    Manually complete a printing job
   * @route   POST /api/v1/printing/complete
   * @access  Admin only
   */
  public static completePrintingJob = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { jobId } = req.body;

      const updatedJob = await PrintingService.completePrintingJob(jobId);

      sendSuccess(res, 200, "PrintingJob completed successfully.", {
        jobId: updatedJob._id,
        status: updatedJob.status,
        finishedAt: updatedJob.finishedAt,
      });
    },
  );

  /**
   * @desc    Manually fail a printing job
   * @route   POST /api/v1/printing/fail
   * @access  Admin only
   */
  public static failPrintingJob = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { jobId } = req.body;

      const updatedJob = await PrintingService.failPrintingJob(jobId);

      sendSuccess(res, 200, "PrintingJob marked as failed.", {
        jobId: updatedJob._id,
        status: updatedJob.status,
        finishedAt: updatedJob.finishedAt,
      });
    },
  );

  /**
   * @desc    Get a printing job by ID with full population
   * @route   GET /api/v1/printing/status/:jobId
   * @access  Admin or Operator
   */
  public static getJobById = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const job = await PrintingService.getJobById(req.params.jobId as string);

      if (!job) {
        sendSuccess(res, 404, "PrintingJob not found.", null);
        return;
      }

      sendSuccess(res, 200, "PrintingJob retrieved successfully.", { job });
    },
  );
}