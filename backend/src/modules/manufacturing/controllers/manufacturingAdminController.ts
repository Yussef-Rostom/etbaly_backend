import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { queueManager, QUEUE_NAMES } from "#src/utils/queueManager";
import { SlicingJobData, PrintingJobData } from "#src/workers/registry";
import { sendSuccess } from "#src/utils/apiResponse";

export class ManufacturingController {
  /**
   * @desc    Start a manufacturing job process (slicing/printing)
   * @route   POST /api/v1/manufacturing/execute
   * @access  Private
   */
  public static executeJob = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { jobId, action } = req.body;
      const ownerId = (req.user as any)?.id || (req.user as any)?._id?.toString() || "system"; // fallback if user id is undefined depending on auth middleware

      if (action === "start_slicing") {
        const slicingQueue = queueManager.getQueue(QUEUE_NAMES.SLICING);
        await slicingQueue.add("slice-model", {
          modelFileKey: `model_${jobId}.stl`,
          designId: jobId,
          material: req.body.material || 'PLA',
          ownerId: ownerId,
          correlationId: `slice-${jobId}-${Date.now()}`
        } as SlicingJobData);
      } else if (action === "start_printing") {
        const printingQueue = queueManager.getQueue(QUEUE_NAMES.PRINTING);
        await printingQueue.add("print-model", {
          gcodeFileKey: `gcode_${jobId}.gcode`,
          designId: jobId,
          ownerId: ownerId,
          correlationId: `print-${jobId}-${Date.now()}`
        } as PrintingJobData);
      }

      sendSuccess(res, 200, `Job ${jobId} dispatched to ${action} queue successfully.`);
    },
  );
}
