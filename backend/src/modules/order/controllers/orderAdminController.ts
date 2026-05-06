import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { OrderAdminService } from "#src/modules/order/services/orderAdminService";
import { AdminOrdersQuery } from "#src/modules/order/validators/orderValidators";

export class OrderAdminController {
  static getAllOrders = catchAsync(async (req: Request, res: Response) => {
    const { orders, total, page, limit } = await OrderAdminService.getAllOrders(
      req.query as unknown as AdminOrdersQuery,
    );

    sendSuccess(res, 200, "All orders fetched successfully", { orders, total, page, limit });
  });

  static getOrderById = catchAsync(async (req: Request, res: Response) => {
    const order = await OrderAdminService.getOrderById(req.params.id as string);

    sendSuccess(res, 200, "Order fetched successfully", { order });
  });
}
