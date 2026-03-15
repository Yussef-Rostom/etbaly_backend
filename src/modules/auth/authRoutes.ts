import { Router } from "express";
import { AuthController } from "./controllers/AuthController";
import { validate } from "../../middlewares/validate";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
} from "./validators/authValidators";

const router = Router();

router.post("/register", validate(registerSchema), AuthController.register);
router.post("/verify-otp", validate(verifyOtpSchema), AuthController.verifyOtp);
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/google", validate(googleAuthSchema), AuthController.googleAuth);
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  AuthController.forgotPassword,
);
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  AuthController.resetPassword,
);
router.post(
  "/refresh-token",
  validate(refreshTokenSchema),
  AuthController.refreshToken,
);
router.post("/logout", AuthController.logout);

export default router;
