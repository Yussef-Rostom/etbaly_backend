import { Router } from "express";
import { DesignAdminController } from "../controllers/designAdminController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import { updateDesignSchema } from "../validators/designAdminValidators";

const router = Router();

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.use(authMiddleware, restrictTo("admin"));

router.patch("/:id", validate(updateDesignSchema), DesignAdminController.update);
router.delete("/:id", DesignAdminController.delete);

export default router;
