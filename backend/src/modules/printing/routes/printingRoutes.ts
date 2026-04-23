import { Router } from "express";
import { PrintingController } from "#src/modules/printing/controllers/printingController";
import { validate } from "#src/middlewares/validate";
import {
  executePrintingJobSchema,
  reviewPrintingJobSchema,
  startPrintingJobSchema,
  completePrintingJobSchema,
  failPrintingJobSchema,
} from "#src/modules/printing/validators/printingValidators";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";

const router = Router();

// Public routes for authenticated users
router
  .route("/execute")
  .post(authMiddleware, validate(executePrintingJobSchema), PrintingController.createPrintingJob);

router
  .route("/status/:jobId")
  .get(authMiddleware, PrintingController.getPrintingJobStatus);

// Require authentication and admin/operator role for management routes
router.use(authMiddleware, restrictTo("admin", "operator"));

// Printing job management routes (admin only)
router
  .route("/review")
  .post(
    restrictTo("admin"),
    validate(reviewPrintingJobSchema),
    PrintingController.reviewPrintingJob
  );

router
  .route("/queued")
  .get(restrictTo("admin"), PrintingController.getQueuedJobs);

router
  .route("/start")
  .post(
    restrictTo("admin"),
    validate(startPrintingJobSchema),
    PrintingController.startPrintingJob
  );

router
  .route("/complete")
  .post(
    restrictTo("admin"),
    validate(completePrintingJobSchema),
    PrintingController.completePrintingJob
  );

router
  .route("/fail")
  .post(
    restrictTo("admin"),
    validate(failPrintingJobSchema),
    PrintingController.failPrintingJob
  );

export default router;
