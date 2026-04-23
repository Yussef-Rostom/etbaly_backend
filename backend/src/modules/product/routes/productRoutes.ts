import { Router } from "express";
import { ProductController } from "../controllers/productController";

const router = Router();

// ─── Public routes ────────────────────────────────────────────────────────────
router.get("/", ProductController.getAll);
router.get("/:id", ProductController.getOne);

export default router;
