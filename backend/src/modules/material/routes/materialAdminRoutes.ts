import { Router } from "express";
import { MaterialAdminController } from "#src/modules/material/controllers/materialAdminController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import {
  createMaterialSchema,
  updateMaterialSchema,
  deleteMaterialSchema,
} from "#src/modules/material/validators/materialValidators";

const router = Router();

// Require authentication and admin role for all admin material routes
router.use(authMiddleware);
router.use(restrictTo("admin"));

router
  .route("/")
  .get(MaterialAdminController.getAllMaterials)
  .post(validate(createMaterialSchema), MaterialAdminController.createMaterial);

router
  .route("/:id")
  .patch(validate(updateMaterialSchema), MaterialAdminController.updateMaterial)
  .delete(validate(deleteMaterialSchema), MaterialAdminController.deleteMaterial);

export default router;
