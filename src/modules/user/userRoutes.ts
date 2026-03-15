import { Router } from "express";
import { UserController } from "#src/modules/user/controllers/UserController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { validate } from "#src/middlewares/validate";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "#src/modules/user/validators/userValidators";
import { uploadMedia } from "#src/middlewares/uploadMiddleware";

const router = Router();

router.use(authMiddleware);

router
  .route("/me")
  .get(UserController.getMe)
  .patch(validate(updateProfileSchema), UserController.updateMe);

router.patch(
  "/me/password",
  validate(changePasswordSchema),
  UserController.changePassword,
);

router.patch(
  "/me/avatar",
  uploadMedia.single("avatar"),
  UserController.uploadAvatar,
);

export default router;
