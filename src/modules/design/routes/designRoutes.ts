import { Router } from "express";
import { DesignController } from "../controllers/designController";
import { authMiddleware } from "#src/middlewares/authMiddleware";

const router = Router();

// ─── Authenticated user routes ────────────────────────────────────────────────
router.use(authMiddleware);

router.get("/", DesignController.getAll);
router.get("/:id", DesignController.getOne);

export default router;
