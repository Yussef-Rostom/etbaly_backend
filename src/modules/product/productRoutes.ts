import { Router } from "express";
import multer from "multer";
import { ProductController } from "#src/modules/product/controllers/ProductController";
import { ProductAdminController } from "#src/modules/product/controllers/ProductAdminController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import {
  createProductSchema,
  updateProductSchema,
} from "#src/modules/product/validators/productAdminValidators";

const router = Router();

const uploadProductImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ─── Public routes ────────────────────────────────────────────────────────────
router.get("/", ProductController.getAll);
router.get("/:id", ProductController.getOne);

// ─── Admin routes ─────────────────────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(authMiddleware, restrictTo("admin"));

adminRouter.get("/", ProductAdminController.getAll);
adminRouter.post("/", validate(createProductSchema), ProductAdminController.create);
adminRouter.post("/upload-image", uploadProductImage.single("image"), ProductAdminController.uploadImage);
adminRouter.get("/:id", ProductAdminController.getOne);
adminRouter.patch("/:id", validate(updateProductSchema), ProductAdminController.update);
adminRouter.delete("/:id", ProductAdminController.delete);

router.use("/admin", adminRouter);

export default router;
