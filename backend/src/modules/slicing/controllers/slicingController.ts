import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { queueManager, QUEUE_NAMES } from "#src/utils/queueManager";
import { SlicingJobData } from "#src/workers/registry";
import { sendSuccess } from "#src/utils/apiResponse";
import { SlicingService } from "#src/modules/slicing/services/slicingService";
import { MaterialService } from "#src/modules/material/services/materialService";
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
      const { designId, material, color, preset, scale } = req.body;
      const user = getAuthUser(req);

      // Fetch the design
      const design = await Design.findById(designId);
      if (!design) {
        throw new AppError("Design not found", 404);
      }

      // Validate material if provided
      let normalizedMaterial = "PLA"; // Default
      if (material) {
        const validatedMaterial = await MaterialService.validateMaterial(material);
        normalizedMaterial = validatedMaterial.type;
      }

      // Check for existing completed job with same parameters
      const existingJob = await SlicingService.findExistingCompletedJob(
        new mongoose.Types.ObjectId(designId),
        normalizedMaterial,
        preset,
        scale
      );

      if (existingJob) {
        console.log(`♻️  Copying results from existing slicing job ${existingJob._id} for user ${user._id}`);
        
        // Create a new job for this user with copied results
        const newJob = await SlicingService.createSlicingJobFromExisting(
          user._id,
          existingJob,
          color
        );

        sendSuccess(res, 200, `Slicing job created for design ${design.name} using existing results.`, {
          jobId: newJob._id,
          status: newJob.status,
          designId: design._id,
          designName: design.name,
          gcodeUrl: newJob.gcodeUrl,
          weight: newJob.weight,
          dimensions: newJob.dimensions,
          printTime: newJob.printTime,
          calculatedPrice: newJob.calculatedPrice,
          reused: true,
          copiedFromJobId: existingJob._id,
        });
        return;
      }

      // Create SlicingJob document with status "Queued"
      const slicingJob = await SlicingService.createSlicingJob({
        designId: new mongoose.Types.ObjectId(designId),
        userId: user._id,
        fileName: design.name,
        stlFileUrl: design.fileUrl,
        material: normalizedMaterial,
        color,
        preset,
        scale,
        operatorId: user._id,
      });

      // Dispatch to SLICING queue
      const slicingQueue = queueManager.getQueue(QUEUE_NAMES.SLICING);
      const jobData: SlicingJobData = {
        stlUrl: design.fileUrl,
        designId: slicingJob._id.toString(),
        material: normalizedMaterial,
        color,
        ownerId: user._id.toString(),
        jobId: slicingJob._id.toString(),
        ...(preset && { preset }),
        ...(scale !== undefined && { scale }),
      };
      
      await slicingQueue.add("slice-model", jobData);

      sendSuccess(res, 200, `Slicing job for design ${design.name} dispatched successfully.`, {
        jobId: slicingJob._id,
        status: slicingJob.status,
        designId: design._id,
        designName: design.name,
        reused: false,
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
