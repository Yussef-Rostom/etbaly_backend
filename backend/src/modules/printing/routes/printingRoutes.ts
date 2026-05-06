import { Router } from "express";
import { PrintingController } from "#src/modules/printing/controllers/printingController";
import { validate } from "#src/middlewares/validate";
import {
  reviewPrintingJobSchema,
  queuePrintingJobSchema,
  startPrintingJobSchema,
  completePrintingJobSchema,
  failPrintingJobSchema,
} from "#src/modules/printing/validators/printingValidators";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";

const router = Router();

// All routes require authentication and admin/operator role
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
  .route("/queue")
  .post(
    restrictTo("admin"),
    validate(queuePrintingJobSchema),
    PrintingController.queuePrintingJob
  );

router
  .route("/jobs")
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

router
  .route("/status/:jobId")
  .get(PrintingController.getJobById);

export default router;
