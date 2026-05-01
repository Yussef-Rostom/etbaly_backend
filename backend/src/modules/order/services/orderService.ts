import { Types } from "mongoose";
import { Order, IOrder } from "#src/models/Order";
import { IOrderItem } from "#src/models/schemas/OrderItemSchema";
import { IAddress } from "#src/models/schemas/AddressSchema";
import { IPricingSummary } from "#src/models/schemas/PricingSummarySchema";
import { AuthenticatedUser } from "#src/middlewares/authMiddleware";
import { AppError } from "#src/utils/AppError";

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
    return Order.find({ userId })
      .populate("items.itemRefId", "name images thumbnailUrl description")
      .sort({ createdAt: -1 });
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

    return order;
  }
}
