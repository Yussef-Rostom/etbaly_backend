import { Router } from "express";
import { ManufacturingController } from "#src/modules/manufacturing/controllers/manufacturingController";
import { validate } from "#src/middlewares/validate";
import { executeJobSchema } from "#src/modules/manufacturing/validators/manufacturingValidators";
import { authMiddleware } from "#src/middlewares/authMiddleware";

const router = Router();

// Require authentication for all manufacturing routes
router.use(authMiddleware);

router
  .route("/execute")
  .post(validate(executeJobSchema), ManufacturingController.executeJob);

export default router;
