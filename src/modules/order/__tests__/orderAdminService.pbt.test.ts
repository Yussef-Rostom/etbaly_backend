// Feature: order-module, Property 5: assign creates ManufacturingJob with correct field values

import * as fc from "fast-check";
import mongoose from "mongoose";
import { OrderAdminService } from "../services/orderAdminService";

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
import { ManufacturingJob } from "../../../models/ManufacturingJob";

const mockFindById = Order.findById as jest.Mock;
const mockCreate = ManufacturingJob.create as jest.Mock;

/** Generates a valid 24-character lowercase hex ObjectId string. */
const hexObjectId = (): fc.Arbitrary<string> =>
  fc.stringMatching(/^[0-9a-f]{24}$/);

/** Generates a non-empty string suitable for a machineId. */
const nonEmptyString = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

describe("OrderAdminService – Property 5: assign creates ManufacturingJob with correct field values", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Validates: Requirements 4.1, 4.2
   *
   * Property 5: For any valid order, order item, machine ID, and operator,
   * calling `assignOrderItem` should produce a ManufacturingJob where
   * `orderId`, `targetOrderItemId`, `machineId`, `operatorId` exactly match
   * the inputs and `status` is `"Queued"`.
   */
  it(
    "Property 5: ManufacturingJob.create is called with orderId, targetOrderItemId, machineId, operatorId matching inputs and status Queued",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          hexObjectId(), // orderId
          hexObjectId(), // orderItemId
          nonEmptyString(), // machineId
          hexObjectId(), // operatorId
          async (orderId, orderItemId, machineId, operatorId) => {
            // Reset mocks on each iteration so call counts are accurate
            jest.clearAllMocks();

            const orderObjectId = new mongoose.Types.ObjectId(orderId);
            const orderItemObjectId = new mongoose.Types.ObjectId(orderItemId);

            // Build a mock order containing the generated orderItemId
            const mockOrder = {
              _id: orderObjectId,
              items: [
                {
                  _id: orderItemObjectId,
                  status: "Queued",
                },
              ],
              save: jest.fn().mockResolvedValue(undefined),
            };

            mockFindById.mockResolvedValue(mockOrder);

            // Capture the args passed to ManufacturingJob.create
            let capturedArgs: Record<string, unknown> | null = null;
            mockCreate.mockImplementation((args: Record<string, unknown>) => {
              capturedArgs = args;
              return Promise.resolve({
                ...args,
                _id: new mongoose.Types.ObjectId(),
              });
            });

            await OrderAdminService.assignOrderItem(
              orderId,
              { orderItemId, machineId },
              operatorId,
            );

            // Assert ManufacturingJob.create was called exactly once per iteration
            expect(mockCreate).toHaveBeenCalledTimes(1);
            expect(capturedArgs).not.toBeNull();

            const args = capturedArgs!;

            // orderId must match
            expect(args.orderId?.toString()).toBe(orderObjectId.toString());

            // targetOrderItemId must match the input orderItemId
            expect(args.targetOrderItemId?.toString()).toBe(orderItemId);

            // machineId must match exactly
            expect(args.machineId).toBe(machineId);

            // operatorId must match
            expect(args.operatorId?.toString()).toBe(operatorId);

            // status must be "Queued"
            expect(args.status).toBe("Queued");
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

// Feature: order-module, Property 6: assign sets order item status to "Printing"

describe("OrderAdminService – Property 6: assign sets order item status to \"Printing\"", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Validates: Requirements 4.4
   *
   * Property 6: For any order item that is assigned via `assignOrderItem`,
   * the item's `status` field in the Order document should be `"Printing"`
   * after the operation completes.
   */
  it(
    "Property 6: order item status is mutated to \"Printing\" and order.save() is called",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          hexObjectId(), // orderId
          hexObjectId(), // orderItemId
          nonEmptyString(), // machineId
          hexObjectId(), // operatorId
          async (orderId, orderItemId, machineId, operatorId) => {
            jest.clearAllMocks();

            const orderObjectId = new mongoose.Types.ObjectId(orderId);
            const orderItemObjectId = new mongoose.Types.ObjectId(orderItemId);

            // The item starts with status "Queued"
            const mockOrderItem = {
              _id: orderItemObjectId,
              status: "Queued" as string,
            };

            const mockSave = jest.fn().mockResolvedValue(undefined);

            const mockOrder = {
              _id: orderObjectId,
              items: [mockOrderItem],
              save: mockSave,
            };

            mockFindById.mockResolvedValue(mockOrder);
            mockCreate.mockResolvedValue({
              _id: new mongoose.Types.ObjectId(),
              orderId: orderObjectId,
              targetOrderItemId: orderItemId,
              machineId,
              operatorId,
              status: "Queued",
            });

            await OrderAdminService.assignOrderItem(
              orderId,
              { orderItemId, machineId },
              operatorId,
            );

            // The item's status must have been mutated to "Printing"
            expect(mockOrderItem.status).toBe("Printing");

            // order.save() must have been called to persist the mutation
            expect(mockSave).toHaveBeenCalledTimes(1);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
