import { Order, IOrder } from "#src/models/Order";
import { AppError } from "#src/utils/AppError";
import { AdminOrdersQuery } from "#src/modules/order/validators/orderValidators";

export class OrderAdminService {
  static async getAllOrders(query: AdminOrdersQuery): Promise<{
    orders: IOrder[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, page = 1, limit = 20 } = query;

    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    return { orders, total, page, limit };
  }
}
