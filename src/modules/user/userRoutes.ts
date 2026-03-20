import { Router } from "express";
import { UserController } from "#src/modules/user/controllers/UserController";
import { AdminUserController } from "#src/modules/user/controllers/AdminUserController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "#src/modules/user/validators/userValidators";
import { updateRoleSchema } from "#src/modules/user/validators/userAdminValidators";
import { uploadMedia } from "#src/middlewares/uploadMiddleware";

const router = Router();

// ─── Authenticated user routes ────────────────────────────────────────────────
router.use(authMiddleware);

router
  .route("/me")
  .get(UserController.getMe)
  .patch(validate(updateProfileSchema), UserController.updateMe);

router.patch("/me/password", validate(changePasswordSchema), UserController.changePassword);
router.patch("/me/avatar", uploadMedia.single("avatar"), UserController.uploadAvatar);

// ─── Admin routes ─────────────────────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(restrictTo("admin"));

adminRouter.get("/", AdminUserController.getAllUsers);
adminRouter.patch("/:id/role", validate(updateRoleSchema), AdminUserController.updateUserRole);
adminRouter.delete("/:id", AdminUserController.deleteUser);

router.use("/admin", adminRouter);

export default router;
