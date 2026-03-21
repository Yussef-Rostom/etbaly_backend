import { Router } from "express";
import multer from "multer";
import { ProductAdminController } from "../controllers/productAdminController";
import { authMiddleware } from "../../../middlewares/authMiddleware";
import { restrictTo } from "../../../middlewares/roleMiddleware";
import { validate } from "../../../middlewares/validate";
import {
  createProductSchema,
  updateProductSchema,
} from "../validators/productAdminValidators";

const router = Router();

// Configure multer for product image uploads
const uploadProductImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.use(authMiddleware, restrictTo("admin"));

router.get("/", ProductAdminController.getAll);
router.post("/", validate(createProductSchema), ProductAdminController.create);
router.post("/upload-image", uploadProductImage.single("image"), ProductAdminController.uploadImage);
router.get("/:id", ProductAdminController.getOne);
router.patch("/:id", validate(updateProductSchema), ProductAdminController.update);
router.delete("/:id", ProductAdminController.delete);

export default router;
