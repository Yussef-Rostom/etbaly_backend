import { Types } from "mongoose";
import { Order, IOrder } from "#src/models/Order";
import { IOrderItem } from "#src/models/schemas/OrderItemSchema";
import { IAddress } from "#src/models/schemas/AddressSchema";
import { IPricingSummary } from "#src/models/schemas/PricingSummarySchema";
import { AuthenticatedUser } from "#src/middlewares/authMiddleware";
import { AppError } from "#src/utils/AppError";
import { PrintingJob } from "#src/models/PrintingJob";

export interface CreateOrderInput {
  userId: string;
  items: Omit<IOrderItem, "_id">[];
  shippingAddressSnapshot: IAddress;
  paymentMethod: "Card" | "Wallet" | "COD";
  pricingSummary: IPricingSummary;
}

export class OrderService {
  static async createOrder(dto: CreateOrderInput): Promise<IOrder> {
    const orderId = new Types.ObjectId();
    return Order.create({
      _id: orderId,
      userId: dto.userId,
      items: dto.items,
      shippingAddressSnapshot: dto.shippingAddressSnapshot,
      paymentInfo: { method: dto.paymentMethod, status: "Pending", amountPaid: 0 },
      pricingSummary: dto.pricingSummary,
      status: "Pending",
    });
  }

  static async getMyOrders(userId: string): Promise<IOrder[]> {
    const orders = await Order.find({ userId })
      .populate("items.itemRefId", "name images thumbnailUrl description")
      .sort({ createdAt: -1 });

    // Get all printing jobs for these orders
    const orderIds = orders.map(order => order._id);
    const printingJobs = await PrintingJob.find({
      orderId: { $in: orderIds },
    }).select("orderId orderItemId status");

    // Create a map of orderId -> orderItemId -> printing job statuses
    const printingJobStatusMap = new Map<string, Map<string, string[]>>();
    for (const job of printingJobs) {
      const orderId = job.orderId.toString();
      const itemId = job.orderItemId.toString();
      
      if (!printingJobStatusMap.has(orderId)) {
        printingJobStatusMap.set(orderId, new Map());
      }
      
      const orderMap = printingJobStatusMap.get(orderId)!;
      if (!orderMap.has(itemId)) {
        orderMap.set(itemId, []);
      }
      
      orderMap.get(itemId)!.push(job.status);
    }

    // Attach printing job statuses to each order item
    return orders.map(order => {
      const orderObj = order.toObject();
      const orderId = order._id.toString();
      const orderItemMap = printingJobStatusMap.get(orderId);
      
      if (orderItemMap) {
        orderObj.items = orderObj.items.map((item: any) => {
          const itemId = item._id.toString();
          const printingStatuses = orderItemMap.get(itemId) || [];
          
          return {
            ...item,
            printingJobs: printingStatuses,
          };
        });
      }
      
      return orderObj as IOrder;
    });
  }

  static async getOrderById(
    orderId: string,
    requestingUser: AuthenticatedUser,
  ): Promise<IOrder> {
    const order = await Order.findById(orderId)
      .populate("items.itemRefId", "name images thumbnailUrl description");

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (
      requestingUser.role === "client" &&
      order.userId.toString() !== requestingUser._id.toString()
    ) {
      throw new AppError("You do not have permission to perform this action.", 403);
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
