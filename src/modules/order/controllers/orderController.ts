import { Request, Response } from "express";
import { OrderService } from "#src/modules/order/services/orderService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { getAuthUser } from "#src/middlewares/authMiddleware";

export class OrderController {
  static getMyOrders = catchAsync(async (req: Request, res: Response) => {
    const orders = await OrderService.getMyOrders(getAuthUser(req)._id.toString());

    sendSuccess(res, 200, "Orders fetched successfully", { orders });
  });

  static getOrderById = catchAsync(async (req: Request, res: Response) => {
    const order = await OrderService.getOrderById(req.params.id, getAuthUser(req));

    sendSuccess(res, 200, "Order fetched successfully", { order });
  });
}
