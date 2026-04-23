import { Router } from "express";
import { AdminUserController } from "../controllers/userAdminController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import { updateRoleSchema } from "../validators/userAdminValidators";

const router = Router();

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.use(authMiddleware, restrictTo("admin"));

router.get("/", AdminUserController.getAllUsers);
router.patch("/:id/role", validate(updateRoleSchema), AdminUserController.updateUserRole);
router.delete("/:id", AdminUserController.deleteUser);

export default router;
