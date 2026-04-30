import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { MaterialService } from "#src/modules/material/services/materialService";

export class MaterialController {
  /**
   * @desc    Get all available active materials
   * @route   GET /api/v1/materials
   * @access  Authenticated Users
   */
  public static getAvailableMaterials = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const materials = await MaterialService.getAvailableMaterials();

      sendSuccess(res, 200, "Available materials retrieved successfully.", {
        materials: materials.map(m => ({
          type: m.type,
          name: m.name,
          pricePerGram: m.currentPricePerGram,
          color: m.color,
        })),
      });
    },
  );
}
