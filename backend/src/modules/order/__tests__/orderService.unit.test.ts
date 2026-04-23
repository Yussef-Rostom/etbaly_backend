// Feature: order-module
import mongoose from "mongoose";
import { OrderService } from "../services/orderService";
import { AppError } from "../../../utils/AppError";
import { AuthenticatedUser } from "../../../middlewares/authMiddleware";

// Mock the Order model
jest.mock("../../../models/Order", () => ({
  Order: {
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

import { Order } from "../../../models/Order";

const mockFind = Order.find as jest.Mock;
const mockFindById = Order.findById as jest.Mock;

const makeUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  _id: new mongoose.Types.ObjectId(),
  email: "user@example.com",
  role: "client",
  isVerified: true,
  ...overrides,
});

describe("OrderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feature: order-module
  describe("getMyOrders", () => {
    it("returns an empty array when the user has no orders", async () => {
      // Arrange
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const userId = new mongoose.Types.ObjectId().toString();

      // Act
      const result = await OrderService.getMyOrders(userId);

      // Assert
      expect(result).toEqual([]);
      expect(mockFind).toHaveBeenCalledWith({ userId });
    });
  });

  // Feature: order-module
  describe("getOrderById", () => {
    it("throws AppError with status 404 when the order does not exist", async () => {
      // Arrange
      mockFindById.mockResolvedValue(null);

      const user = makeUser();
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      // Act & Assert
      await expect(OrderService.getOrderById(nonExistentId, user)).rejects.toThrow(
        new AppError("Order not found.", 404),
      );

      const thrown = await OrderService.getOrderById(nonExistentId, user).catch((e) => e);
      expect(thrown).toBeInstanceOf(AppError);
      expect(thrown.statusCode).toBe(404);
      expect(thrown.message).toBe("Order not found.");
    });

    it("throws AppError with status 403 when a client requests another user's order", async () => {
      // Arrange
      const clientUser = makeUser({ role: "client" });
      const otherUserId = new mongoose.Types.ObjectId();

      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        userId: otherUserId,
      };

      mockFindById.mockResolvedValue(mockOrder);

      const orderId = mockOrder._id.toString();

      // Act & Assert
      const thrown = await OrderService.getOrderById(orderId, clientUser).catch((e) => e);
      expect(thrown).toBeInstanceOf(AppError);
      expect(thrown.statusCode).toBe(403);
      expect(thrown.message).toBe("You do not have permission to perform this action.");
    });
  });
});
