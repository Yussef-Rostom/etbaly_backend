import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { getAuthUser } from "#src/middlewares/authMiddleware";
import { OrderAdminService } from "#src/modules/order/services/orderAdminService";
import { AdminOrdersQuery, AssignOrderItemInput } from "#src/modules/order/validators/orderValidators";

export class OrderAdminController {
  static getAllOrders = catchAsync(async (req: Request, res: Response) => {
    const { orders, total, page, limit } = await OrderAdminService.getAllOrders(
      req.query as unknown as AdminOrdersQuery,
    );

    sendSuccess(res, 200, "All orders fetched successfully", { orders, total, page, limit });
  });

  static assignOrderItem = catchAsync(async (req: Request, res: Response) => {
    const job = await OrderAdminService.assignOrderItem(
      req.params.id,
      req.body as AssignOrderItemInput,
      getAuthUser(req)._id.toString(),
    );

    sendSuccess(res, 201, "Job assigned successfully", { job });
  });
}
