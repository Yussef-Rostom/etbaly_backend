import { Router } from "express";
import { ManufacturingController } from "./controllers/manufacturingController";
import { validate } from "../../middlewares/validate";
import { executeJobSchema } from "./validators/manufacturingValidators";
import { authMiddleware } from "../../middlewares/authMiddleware";

const router = Router();

// Require authentication for all manufacturing routes
router.use(authMiddleware);

router
  .route("/execute")
  .post(validate(executeJobSchema), ManufacturingController.executeJob);

export default router;
