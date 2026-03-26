import { Order, IOrder } from "#src/models/Order";
import { AuthenticatedUser } from "#src/middlewares/authMiddleware";
import { AppError } from "#src/utils/AppError";

export class OrderService {
  static async getMyOrders(userId: string): Promise<IOrder[]> {
    return Order.find({ userId }).sort({ createdAt: -1 });
  }

  static async getOrderById(
    orderId: string,
    requestingUser: AuthenticatedUser,
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);

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
