import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { dispatchJob } from "#src/utils/queueManager";
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

      if (action === "start_slicing") {
        await dispatchJob("slicing-tasks", "slice-model", {
          manufacturingJobId: jobId,
          fileName: `model_${jobId}.stl`,
        });
      } else if (action === "start_printing") {
        await dispatchJob("3d-printing-tasks", "print-model", {
          manufacturingJobId: jobId,
          machineId: "default-printer",
        });
      }

      sendSuccess(res, 200, `Job ${jobId} dispatched to ${action} queue successfully.`);
    },
  );
}
