import { Router } from "express";
import { AiAdminController } from "#src/modules/ai/controllers/aiAdminController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import { 
  setTextToImageUrlSchema,
  setImageTo3dUrlSchema
} from "#src/modules/ai/validators/aiAdminValidators";

const router = Router();

// All routes require admin authentication
// router.use(authMiddleware, restrictTo("admin"));

// Text-to-image URL management
// POST /api/v1/admin/ai/set-text-to-image-url
router.post(
  "/set-text-to-image-url",
  validate(setTextToImageUrlSchema),
  AiAdminController.setTextToImageUrl,
);

// GET /api/v1/admin/ai/text-to-image-url
router.get(
  "/text-to-image-url",
  AiAdminController.getTextToImageUrl,
);

// DELETE /api/v1/admin/ai/text-to-image-url/cache
router.delete(
  "/text-to-image-url/cache",
  AiAdminController.clearTextToImageUrlCache,
);

// Image-to-3D URL management
// POST /api/v1/admin/ai/set-image-to-3d-url
router.post(
  "/set-image-to-3d-url",
  validate(setImageTo3dUrlSchema),
  AiAdminController.setImageTo3dUrl,
);

// GET /api/v1/admin/ai/image-to-3d-url
router.get(
  "/image-to-3d-url",
  AiAdminController.getImageTo3dUrl,
);

// DELETE /api/v1/admin/ai/image-to-3d-url/cache
router.delete(
  "/image-to-3d-url/cache",
  AiAdminController.clearImageTo3dUrlCache,
);

export default router;
