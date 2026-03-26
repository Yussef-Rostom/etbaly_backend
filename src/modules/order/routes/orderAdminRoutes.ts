import { Router } from "express";
import { OrderAdminController } from "#src/modules/order/controllers/orderAdminController";
import { validate } from "#src/middlewares/validate";
import { adminOrdersQuerySchema, objectIdParamSchema, assignOrderItemSchema } from "#src/modules/order/validators/orderValidators";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";

const router = Router();

// Require authentication and operator/admin role for all admin order routes
router.use(authMiddleware, restrictTo("operator", "admin"));

router
  .route("/")
  .get(validate(adminOrdersQuerySchema, "query"), OrderAdminController.getAllOrders);

router
  .route("/:id/assign")
  .post(
    validate(objectIdParamSchema, "params"),
    validate(assignOrderItemSchema),
    OrderAdminController.assignOrderItem,
  );

export default router;
