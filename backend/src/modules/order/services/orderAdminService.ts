import { Order, IOrder } from "#src/models/Order";
import { AppError } from "#src/utils/AppError";
import { AdminOrdersQuery } from "#src/modules/order/validators/orderValidators";
import { PrintingJob } from "#src/models/PrintingJob";

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

  static async getOrderById(orderId: string): Promise<IOrder> {
    const order = await Order.findById(orderId)
      .populate("items.itemRefId", "name images thumbnailUrl description")
      .populate("userId", "name email");

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    // Populate printing job status for each order item
    const printingJobs = await PrintingJob.find({
      orderId: order._id,
    }).select("orderItemId status");

    // Create a map of orderItemId -> printing job statuses
    const printingJobStatusMap = new Map<string, string[]>();
    for (const job of printingJobs) {
      const itemId = job.orderItemId.toString();
      if (!printingJobStatusMap.has(itemId)) {
        printingJobStatusMap.set(itemId, []);
      }
      printingJobStatusMap.get(itemId)!.push(job.status);
    }

    // Attach printing job statuses to each order item
    const orderWithStatus = order.toObject();
    orderWithStatus.items = orderWithStatus.items.map((item: any) => {
      const itemId = item._id.toString();
      const printingStatuses = printingJobStatusMap.get(itemId) || [];
      
      return {
        ...item,
        printingJobs: printingStatuses,
      };
    });

    return orderWithStatus as IOrder;
  }
}
