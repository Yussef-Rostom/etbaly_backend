import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { queueManager, QUEUE_NAMES } from "#src/utils/queueManager";
import { SlicingJobData } from "#src/workers/registry";
import { sendSuccess } from "#src/utils/apiResponse";
import { SlicingService } from "#src/modules/slicing/services/slicingService";
import { Design } from "#src/models/Design";
import { AppError } from "#src/utils/AppError";
import mongoose from "mongoose";

export class SlicingController {
  /**
   * @desc    Start a slicing job process
   * @route   POST /api/v1/slicing/execute
   * @access  Authenticated Users
   */
  public static executeSlicingJob = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { designId } = req.body;
      const ownerId = (req.user as any)?.id || (req.user as any)?._id?.toString() || "system";

      // Validate and fetch the design
      if (!mongoose.Types.ObjectId.isValid(designId)) {
        throw new AppError("Invalid design ID", 400);
      }

      const design = await Design.findById(designId);
      if (!design) {
        throw new AppError("Design not found", 404);
      }

      // Generate unique job number
      const jobNumber = `SLICE-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create SlicingJob document with status "Queued"
      const slicingJob = await SlicingService.createSlicingJob({
        jobNumber,
        designId: designId as any,
        fileName: design.name,
        stlFileUrl: design.fileUrl,
        operatorId: ownerId as any,
      });

      // Dispatch to SLICING queue
      const slicingQueue = queueManager.getQueue(QUEUE_NAMES.SLICING);
      const jobData: SlicingJobData = {
        modelFileKey: design.fileUrl,
        designId: slicingJob._id.toString(),
        material: req.body.material || 'PLA',
        ownerId: ownerId,
        correlationId: `slice-${designId}-${Date.now()}`
      };
      
      // Add optional fields if provided
      if (req.body.preset) {
        jobData.preset = req.body.preset;
      }
      if (req.body.scale !== undefined) {
        jobData.scale = req.body.scale;
      }
      
      await slicingQueue.add("slice-model", jobData);

      sendSuccess(res, 200, `Slicing job for design ${design.name} dispatched successfully.`, {
        jobId: slicingJob._id,
        jobNumber: slicingJob.jobNumber,
        status: slicingJob.status,
        designId: design._id,
        designName: design.name,
      });
    },
  );

  /**
   * @desc    Get the status of a slicing job
   * @route   GET /api/v1/slicing/status/:jobId
   * @access  Authenticated Users
   */
  public static getSlicingJobStatus = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const jobId = req.params.jobId as string;

      const slicingJob = await SlicingService.getSlicingJobById(jobId);

      if (!slicingJob) {
        sendSuccess(res, 404, "SlicingJob not found.", null);
        return;
      }

      sendSuccess(res, 200, "SlicingJob status retrieved successfully.", {
        jobId: slicingJob._id,
        jobNumber: slicingJob.jobNumber,
        status: slicingJob.status,
        stlFileUrl: slicingJob.stlFileUrl,
        gcodeUrl: slicingJob.gcodeUrl,
        fileName: slicingJob.fileName,
        weight: slicingJob.weight,
        dimensions: slicingJob.dimensions,
        printTime: slicingJob.printTime,
        calculatedPrice: slicingJob.calculatedPrice,
        startedAt: slicingJob.startedAt,
        finishedAt: slicingJob.finishedAt,
        createdAt: slicingJob.createdAt,
        updatedAt: slicingJob.updatedAt,
      });
    },
  );
}
