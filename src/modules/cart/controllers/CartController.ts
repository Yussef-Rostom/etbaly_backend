import { Request, Response } from "express";
import { CartService } from "#src/modules/cart/services/CartService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";

export class CartController {
  static getCart = catchAsync(async (req: Request, res: Response) => {
    const cart = await CartService.getCart(req.user._id.toString());

    sendSuccess(res, 200, "Cart fetched successfully", { cart });
  });

  static addItem = catchAsync(async (req: Request, res: Response) => {
    const cart = await CartService.addItem(req.user._id.toString(), req.body);

    sendSuccess(res, 200, "Item added to cart", { cart });
  });

  static updateItem = catchAsync(async (req: Request, res: Response) => {
    const cart = await CartService.updateItem(
      req.user._id.toString(),
      req.params.id as string,
      req.body,
    );

    sendSuccess(res, 200, "Cart item updated", { cart });
  });

  static removeItem = catchAsync(async (req: Request, res: Response) => {
    const cart = await CartService.removeItem(
      req.user._id.toString(),
      req.params.id as string,
    );

    sendSuccess(res, 200, "Item removed from cart", { cart });
  });

  static clearCart = catchAsync(async (req: Request, res: Response) => {
    await CartService.clearCart(req.user._id.toString());

    sendSuccess(res, 200, "Cart cleared");
  });

  static checkout = catchAsync(async (req: Request, res: Response) => {
    const order = await CartService.checkout(
      req.user._id.toString(),
      req.body,
    );

    sendSuccess(res, 201, "Order placed successfully", { order });
  });
}
