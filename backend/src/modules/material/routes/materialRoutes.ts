import { Router } from "express";
import { MaterialController } from "#src/modules/material/controllers/materialController";
import { authMiddleware } from "#src/middlewares/authMiddleware";

const router = Router();

// Require authentication for all material routes
router.use(authMiddleware);

router
  .route("/")
  .get(MaterialController.getAvailableMaterials);

export default router;
