import { Router } from "express";
import { AiController } from "#src/modules/ai/controllers/aiController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import { setLightningUrlSchema } from "#src/modules/ai/validators/aiValidators";

const router = Router();

// Admin only routes
router.post(
  "/set-lightning-url",
  authMiddleware,
  restrictTo("admin"),
  validate(setLightningUrlSchema),
  AiController.setLightningUrl,
);

router.get(
  "/lightning-url",
  authMiddleware,
  restrictTo("admin"),
  AiController.getLightningUrl,
);

export default router;
