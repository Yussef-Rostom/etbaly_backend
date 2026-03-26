// Feature: order-module
import mongoose from "mongoose";
import { OrderAdminService } from "../services/orderAdminService";
import { AppError } from "../../../utils/AppError";

// Mock the Order and ManufacturingJob models
jest.mock("../../../models/Order", () => ({
  Order: {
    findById: jest.fn(),
  },
}));

jest.mock("../../../models/ManufacturingJob", () => ({
  ManufacturingJob: {
    create: jest.fn(),
  },
}));

import { Order } from "../../../models/Order";

const mockFindById = Order.findById as jest.Mock;

describe("OrderAdminService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("assignOrderItem", () => {
    // Feature: order-module
    it("throws AppError with status 404 and message 'Order not found.' when order does not exist", async () => {
      // Arrange
      mockFindById.mockResolvedValue(null);

      const orderId = new mongoose.Types.ObjectId().toString();
      const operatorId = new mongoose.Types.ObjectId().toString();
      const dto = {
        orderItemId: new mongoose.Types.ObjectId().toString(),
        machineId: "machine-1",
      };

      // Act & Assert
      const thrown = await OrderAdminService.assignOrderItem(orderId, dto, operatorId).catch((e) => e);
      expect(thrown).toBeInstanceOf(AppError);
      expect(thrown.statusCode).toBe(404);
      expect(thrown.message).toBe("Order not found.");
    });

    // Feature: order-module
    it("throws AppError with status 404 and message 'Order item not found.' when orderItemId doesn't match any item", async () => {
      // Arrange
      const orderId = new mongoose.Types.ObjectId();
      const operatorId = new mongoose.Types.ObjectId().toString();
      const nonMatchingItemId = new mongoose.Types.ObjectId().toString();

      const mockOrder = {
        _id: orderId,
        items: [
          { _id: new mongoose.Types.ObjectId(), status: "Queued" },
          { _id: new mongoose.Types.ObjectId(), status: "Queued" },
        ],
      };

      mockFindById.mockResolvedValue(mockOrder);

      const dto = {
        orderItemId: nonMatchingItemId,
        machineId: "machine-1",
      };

      // Act & Assert
      const thrown = await OrderAdminService.assignOrderItem(orderId.toString(), dto, operatorId).catch((e) => e);
      expect(thrown).toBeInstanceOf(AppError);
      expect(thrown.statusCode).toBe(404);
      expect(thrown.message).toBe("Order item not found.");
    });
  });
});
