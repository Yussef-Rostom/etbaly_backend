import { Router } from "express";
import { SlicingController } from "#src/modules/slicing/controllers/slicingController";
import { validate } from "#src/middlewares/validate";
import { executeSlicingJobSchema, getSlicingJobStatusSchema } from "#src/modules/slicing/validators/slicingValidators";
import { authMiddleware } from "#src/middlewares/authMiddleware";

const router = Router();

// Require authentication for all slicing routes (available to all authenticated users)
router.use(authMiddleware);

router
  .route("/execute")
  .post(validate(executeSlicingJobSchema), SlicingController.executeSlicingJob);

router
  .route("/status/:jobId")
  .get(SlicingController.getSlicingJobStatus);

export default router;
