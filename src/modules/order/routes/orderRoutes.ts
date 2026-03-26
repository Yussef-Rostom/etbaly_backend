import { Router } from "express";
import { OrderController } from "#src/modules/order/controllers/orderController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { validate } from "#src/middlewares/validate";
import { objectIdParamSchema } from "#src/modules/order/validators/orderValidators";

const router = Router();

router.use(authMiddleware);

router.get("/", OrderController.getMyOrders);
router.get("/:id", validate(objectIdParamSchema, "params"), OrderController.getOrderById);

export default router;
