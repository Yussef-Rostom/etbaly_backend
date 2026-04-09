import { Router } from "express";
import { AiController } from "#src/modules/ai/controllers/aiController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import { setLightningUrlSchema } from "#src/modules/ai/validators/aiValidators";

const router = Router();

// Public routes
router.post(
  "/set-lightning-url",
  validate(setLightningUrlSchema),
  AiController.setLightningUrl,
);

router.get(
  "/lightning-url",
  AiController.getLightningUrl,
);

export default router;
