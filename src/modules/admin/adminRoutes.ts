import { Router } from "express";
import multer from "multer";
import { AdminUserController } from "#src/modules/admin/controllers/AdminUserController";
import { AdminProductController } from "#src/modules/admin/controllers/AdminProductController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import { updateRoleSchema } from "#src/modules/admin/validators/adminUserValidators";
import {
  createProductSchema,
  updateProductSchema,
} from "#src/modules/admin/validators/adminProductValidators";

const router = Router();

const uploadProductImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use(authMiddleware);
router.use(restrictTo("admin"));

router.route("/users").get(AdminUserController.getAllUsers);

router
  .route("/users/:id/role")
  .patch(validate(updateRoleSchema), AdminUserController.updateUserRole);

router.route("/users/:id").delete(AdminUserController.deleteUser);

router
  .route("/products")
  .get(AdminProductController.getAllProducts)
  .post(validate(createProductSchema), AdminProductController.createProduct);

router.post(
  "/products/upload-image",
  uploadProductImage.single("image"),
  AdminProductController.uploadProductImage,
);

router
  .route("/products/:id")
  .get(AdminProductController.getProduct)
  .patch(validate(updateProductSchema), AdminProductController.updateProduct)
  .delete(AdminProductController.deleteProduct);

export default router;
