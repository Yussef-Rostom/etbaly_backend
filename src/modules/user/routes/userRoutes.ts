import { Router } from "express";
import { UserController } from "../controllers/userController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { validate } from "#src/middlewares/validate";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "../validators/userValidators";
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

export default router;
