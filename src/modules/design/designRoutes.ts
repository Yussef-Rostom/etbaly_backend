import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import {
  createDesignSchema,
  updateDesignSchema,
} from "#src/modules/design/validators/designValidators";
import { DesignController } from "./controllers/DesignController";

const router = Router();

const uploadDesign = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.use(authMiddleware);

router.post("/upload", restrictTo("admin"), uploadDesign.single("file"), DesignController.uploadDesignFile);
router.post("/", restrictTo("admin"), validate(createDesignSchema), DesignController.createDesign);
router.get("/", DesignController.getDesigns);
router.get("/:id", DesignController.getDesignById);
router.patch("/:id", restrictTo("admin"), validate(updateDesignSchema), DesignController.updateDesign);
router.delete("/:id", restrictTo("admin"), DesignController.deleteDesign);

export default router;
