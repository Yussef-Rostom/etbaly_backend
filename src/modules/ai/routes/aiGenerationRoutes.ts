import { Router } from "express";
import multer from "multer";
import { AiGenerationController } from "#src/modules/ai/controllers/aiGenerationController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { validate } from "#src/middlewares/validate";
import { 
  generateDesignFromImageSchema, 
  generateImageFromTextSchema,
  validateImageUpload
} from "#src/modules/ai/validators/aiGenerationValidators";

const router = Router();

// Configure multer for image uploads
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// All routes require authentication
router.use(authMiddleware);

// POST /api/v1/ai/image-to-3d
router.post(
  "/image-to-3d",
  uploadImage.single("image"),
  validateImageUpload,
  validate(generateDesignFromImageSchema),
  AiGenerationController.generateDesignFromImage,
);

// POST /api/v1/ai/text-to-image
router.post(
  "/text-to-image",
  validate(generateImageFromTextSchema),
  AiGenerationController.generateImageFromText,
);

// GET /api/v1/ai/job/:queueName/:jobId
router.get(
  "/job/:queueName/:jobId",
  AiGenerationController.getJobStatus,
);

export default router;
