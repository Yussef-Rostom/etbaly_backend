import { Router } from "express";
import { UserController } from "./controllers/UserController";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validate";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "./validators/userValidators";
import { uploadMedia } from "../../middlewares/uploadMiddleware";

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
