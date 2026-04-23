import { Order, IOrder } from "#src/models/Order";
import { ManufacturingJob, IManufacturingJob } from "#src/models/ManufacturingJob";
import { AppError } from "#src/utils/AppError";
import { AdminOrdersQuery, AssignOrderItemInput } from "#src/modules/order/validators/orderValidators";

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

  static async assignOrderItem(
    orderId: string,
    dto: AssignOrderItemInput,
    operatorId: string,
  ): Promise<IManufacturingJob> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    const orderItem = order.items.find(
      (item) => item._id?.toString() === dto.orderItemId,
    );
    if (!orderItem) {
      throw new AppError("Order item not found.", 404);
    }

    const timestamp = Date.now();
    const random6 = Math.random().toString(36).substring(2, 8);
    const jobNumber = `JOB-${timestamp}-${random6}`;

    const job = await ManufacturingJob.create({
      jobNumber,
      orderId: order._id,
      targetOrderItemId: dto.orderItemId,
      machineId: dto.machineId,
      operatorId,
      status: "Queued",
    });

    orderItem.status = "Printing";
    await order.save();

    return job;
  }
}
