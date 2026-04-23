import { Router } from "express";
import { CartController } from "#src/modules/cart/controllers/cartController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { validate } from "#src/middlewares/validate";
import {
  addCartItemSchema,
  updateCartItemSchema,
  checkoutSchema,
} from "#src/modules/cart/validators/cartValidators";

const router = Router();

router.use(authMiddleware);

router.get("/", CartController.getCart);
router.post("/items", validate(addCartItemSchema), CartController.addItem);
router.patch("/items/:id", validate(updateCartItemSchema), CartController.updateItem);
router.delete("/items/:id", CartController.removeItem);
router.delete("/", CartController.clearCart);
router.post("/checkout", validate(checkoutSchema), CartController.checkout);

export default router;
