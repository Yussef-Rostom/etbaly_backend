import { Router } from "express";
import { AiAdminController } from "#src/modules/ai/controllers/aiAdminController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import { setLightningUrlSchema } from "#src/modules/ai/validators/aiAdminValidators";

const router = Router();

// All routes require admin authentication
router.use(authMiddleware, restrictTo("admin"));

// POST /api/v1/admin/ai/set-lightning-url
router.post(
  "/set-lightning-url",
  validate(setLightningUrlSchema),
  AiAdminController.setLightningUrl,
);

// GET /api/v1/admin/ai/lightning-url
router.get(
  "/lightning-url",
  AiAdminController.getLightningUrl,
);

export default router;
