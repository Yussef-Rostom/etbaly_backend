import { Router } from "express";
import { AdminUserController } from "./controllers/AdminUserController";
import { AdminProductController } from "./controllers/AdminProductController";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { restrictTo } from "../../middlewares/roleMiddleware";
import { validate } from "../../middlewares/validate";
import { updateRoleSchema } from "./validators/adminUserValidators";
import {
  createProductSchema,
  updateProductSchema,
} from "./validators/adminProductValidators";

const router = Router();

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

router
  .route("/products/:id")
  .get(AdminProductController.getProduct)
  .patch(validate(updateProductSchema), AdminProductController.updateProduct)
  .delete(AdminProductController.deleteProduct);

export default router;
