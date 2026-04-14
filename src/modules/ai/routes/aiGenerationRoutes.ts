import { Router } from "express";
import multer from "multer";
import { AiGenerationController } from "#src/modules/ai/controllers/aiGenerationController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { validate } from "#src/middlewares/validate";
import { generateDesignSchema } from "#src/modules/ai/validators/aiGenerationValidators";

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

// POST /api/v1/ai/generate-design
router.post(
  "/generate-design",
  uploadImage.single("image"),
  validate(generateDesignSchema),
  AiGenerationController.generateDesignFromImage,
);

export default router;
