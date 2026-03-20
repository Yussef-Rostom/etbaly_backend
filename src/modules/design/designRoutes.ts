import { Router } from "express";
import multer from "multer";
import { DesignController } from "#src/modules/design/controllers/DesignController";
import { DesignAdminController } from "#src/modules/design/controllers/DesignAdminController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import {
  createDesignSchema,
  updateDesignSchema,
} from "#src/modules/design/validators/designAdminValidators";

const router = Router();

const uploadDesign = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ─── Authenticated user routes ────────────────────────────────────────────────
router.use(authMiddleware);

router.get("/", DesignController.getAll);
router.get("/:id", DesignController.getOne);

// ─── Admin routes ─────────────────────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(restrictTo("admin"));

adminRouter.post("/upload", uploadDesign.single("file"), DesignAdminController.uploadFile);
adminRouter.post("/", validate(createDesignSchema), DesignAdminController.create);
adminRouter.patch("/:id", validate(updateDesignSchema), DesignAdminController.update);
adminRouter.delete("/:id", DesignAdminController.delete);

router.use("/admin", adminRouter);

export default router;
