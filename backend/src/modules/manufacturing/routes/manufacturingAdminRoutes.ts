import { Router } from "express";
import { ManufacturingController } from "#src/modules/manufacturing/controllers/manufacturingAdminController";
import { validate } from "#src/middlewares/validate";
import { executeJobSchema } from "#src/modules/manufacturing/validators/manufacturingAdminValidators";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";

const router = Router();

// Require authentication and admin/operator role for all manufacturing routes
router.use(authMiddleware, restrictTo("admin", "operator"));

router
  .route("/execute")
  .post(validate(executeJobSchema), ManufacturingController.executeJob);

export default router;
