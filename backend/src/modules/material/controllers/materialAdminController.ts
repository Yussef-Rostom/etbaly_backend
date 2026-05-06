import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { MaterialService } from "#src/modules/material/services/materialService";
import { AppError } from "#src/utils/AppError";

export class MaterialAdminController {
  /**
   * @desc    Get all materials (including inactive)
   * @route   GET /api/v1/admin/materials
   * @access  Admin
   */
  public static getAllMaterials = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const materials = await MaterialService.getAllMaterials();

      sendSuccess(res, 200, "All materials retrieved successfully.", {
        results: materials.length,
        materials: materials.map(m => ({
          id: m._id,
          type: m.type,
          name: m.name,
          pricePerGram: m.currentPricePerGram,
          color: m.color,
          isActive: m.isActive,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })),
      });
    },
  );

  /**
   * @desc    Create a new material
   * @route   POST /api/v1/admin/materials
   * @access  Admin
   */
  public static createMaterial = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { name, type, currentPricePerGram, color, isActive } = req.body;

      const material = await MaterialService.createMaterial({
        name: name as string,
        type: type as string,
        currentPricePerGram: currentPricePerGram as number,
        color: (color as string) || "White", // Provide default color
        isActive: isActive as boolean | undefined,
      });

      sendSuccess(res, 201, "Material created successfully.", {
        material: {
          id: material._id,
          type: material.type,
          name: material.name,
          pricePerGram: material.currentPricePerGram,
          color: material.color,
          isActive: material.isActive,
        },
      });
    },
  );

  /**
   * @desc    Update a material
   * @route   PATCH /api/v1/admin/materials/:id
   * @access  Admin
   */
  public static updateMaterial = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { name, currentPricePerGram, color, isActive } = req.body;

      const material = await MaterialService.updateMaterial(id as string, {
        name: name as string | undefined,
        currentPricePerGram: currentPricePerGram as number | undefined,
        color: color as string | undefined,
        isActive: isActive as boolean | undefined,
      });

      if (!material) {
        throw new AppError("Material not found", 404);
      }

      sendSuccess(res, 200, "Material updated successfully.", {
        material: {
          id: material._id,
          type: material.type,
          name: material.name,
          pricePerGram: material.currentPricePerGram,
          color: material.color,
          isActive: material.isActive,
        },
      });
    },
  );

  /**
   * @desc    Delete a material
   * @route   DELETE /api/v1/admin/materials/:id
   * @access  Admin
   */
  public static deleteMaterial = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const material = await MaterialService.deleteMaterial(id as string);

      if (!material) {
        throw new AppError("Material not found", 404);
      }

      sendSuccess(res, 200, "Material deleted successfully.", null);
    },
  );
}
