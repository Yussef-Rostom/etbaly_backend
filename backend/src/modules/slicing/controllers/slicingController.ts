import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { queueManager, QUEUE_NAMES } from "#src/utils/queueManager";
import { SlicingJobData } from "#src/workers/registry";
import { sendSuccess } from "#src/utils/apiResponse";
import { SlicingService } from "#src/modules/slicing/services/slicingService";
import { Design } from "#src/models/Design";
import { AppError } from "#src/utils/AppError";
import { getAuthUser } from "#src/middlewares/authMiddleware";
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
      const user = getAuthUser(req);

      // Fetch the design
      const design = await Design.findById(designId);
      if (!design) {
        throw new AppError("Design not found", 404);
      }

      // Create SlicingJob document with status "Queued"
      const slicingJob = await SlicingService.createSlicingJob({
        designId: new mongoose.Types.ObjectId(designId),
        fileName: design.name,
        stlFileUrl: design.fileUrl,
        operatorId: user._id,
      });

      // Dispatch to SLICING queue
      const slicingQueue = queueManager.getQueue(QUEUE_NAMES.SLICING);
      const jobData: SlicingJobData = {
        stlUrl: design.fileUrl,
        designId: slicingJob._id.toString(),
        material: req.body.material || 'PLA',
        color: req.body.color,
        ownerId: user._id.toString(),
        jobId: slicingJob._id.toString(),
        ...(req.body.preset && { preset: req.body.preset }),
        ...(req.body.scale !== undefined && { scale: req.body.scale }),
      };
      
      await slicingQueue.add("slice-model", jobData);

      sendSuccess(res, 200, `Slicing job for design ${design.name} dispatched successfully.`, {
        jobId: slicingJob._id,
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
