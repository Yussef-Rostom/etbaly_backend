// Feature: order-module, Property 1: order history only contains requesting user's orders
// Feature: order-module, Property 2: order lists are sorted by createdAt descending

import * as fc from "fast-check";
import mongoose from "mongoose";
import { OrderService } from "../services/orderService";
import { OrderAdminService } from "../services/orderAdminService";

// Mock the Order model using the same pattern as unit tests
jest.mock("../../../models/Order", () => ({
  Order: {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock("../../../models/ManufacturingJob", () => ({
  ManufacturingJob: {
    create: jest.fn(),
  },
}));

import { Order } from "../../../models/Order";

const mockFind = Order.find as jest.Mock;
const mockCountDocuments = Order.countDocuments as jest.Mock;

/** Generates a valid 24-character lowercase hex ObjectId string. */
const hexObjectId = (): fc.Arbitrary<string> =>
  fc.stringMatching(/^[0-9a-f]{24}$/);

/** Builds a minimal order-like object for a given userId string. */
const makeOrder = (userId: string) => ({
  _id: new mongoose.Types.ObjectId(),
  userId: new mongoose.Types.ObjectId(userId),
  status: "Pending" as const,
  createdAt: new Date(),
});

/** Builds a minimal order-like object with a given createdAt date. */
const makeOrderWithDate = (createdAt: Date) => ({
  _id: new mongoose.Types.ObjectId(),
  userId: new mongoose.Types.ObjectId(),
  status: "Pending" as const,
  createdAt,
});

describe("OrderService – Property-Based Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Validates: Requirements 1.1
   *
   * Property 1: For any authenticated client and any set of orders in the system,
   * calling `getMyOrders` should return only orders whose `userId` matches the
   * requesting user's `_id` — never orders belonging to other users.
   */
  it(
    "Property 1: getMyOrders returns only orders belonging to the requesting user",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // The requesting user's id
          hexObjectId(),
          // A list of other user ids (1–5 distinct other users)
          fc.array(hexObjectId(), { minLength: 1, maxLength: 5 }),
          // How many orders belong to the requesting user (0–10)
          fc.integer({ min: 0, max: 10 }),
          // How many orders belong to other users (0–10)
          fc.integer({ min: 0, max: 10 }),
          async (userId: string, otherUserIds: string[], ownCount: number, otherCount: number) => {
            // Build the requesting user's orders
            const ownOrders = Array.from({ length: ownCount }, () => makeOrder(userId));

            // Build orders belonging to other users (for reference — not returned by mock)
            const otherOrders = Array.from({ length: otherCount }, (_, i) => {
              const otherId = otherUserIds[i % otherUserIds.length];
              return makeOrder(otherId);
            });

            // The DB query filters by userId, so mock returns only own orders
            mockFind.mockReturnValue({
              sort: jest.fn().mockResolvedValue(ownOrders),
            });

            const result = await OrderService.getMyOrders(userId);

            // Assert: every returned order's userId matches the requesting user
            const expectedUserId = new mongoose.Types.ObjectId(userId).toString();
            for (const order of result) {
              expect(order.userId.toString()).toBe(expectedUserId);
            }

            // Assert: no order from another user leaked through
            const otherOrderIds = new Set(otherOrders.map((o) => o._id.toString()));
            for (const order of result) {
              expect(otherOrderIds.has(order._id.toString())).toBe(false);
            }

            // Assert: Order.find was called with the correct userId filter
            expect(mockFind).toHaveBeenCalledWith({ userId });
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

describe("OrderService / OrderAdminService – Property 2: sorted by createdAt descending", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Validates: Requirements 1.2, 3.2
   *
   * Property 2: For any non-empty list of orders returned by `getMyOrders` or
   * `getAllOrders`, each order's `createdAt` should be greater than or equal to
   * the `createdAt` of the order that follows it.
   */
  it(
    "Property 2: getMyOrders returns orders sorted by createdAt descending",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // A non-empty array of timestamps (as ms since epoch)
          fc.array(fc.integer({ min: 0, max: 2_000_000_000_000 }), {
            minLength: 1,
            maxLength: 20,
          }),
          hexObjectId(),
          async (timestamps: number[], userId: string) => {
            const orders = timestamps.map((ts) =>
              makeOrderWithDate(new Date(ts)),
            );

            // Simulate what the DB does: sort descending before returning
            const sorted = [...orders].sort(
              (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
            );

            mockFind.mockReturnValue({
              sort: jest.fn().mockResolvedValue(sorted),
            });

            const result = await OrderService.getMyOrders(userId);

            // Assert: each element's createdAt >= next element's createdAt
            for (let i = 0; i < result.length - 1; i++) {
              expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(
                result[i + 1].createdAt.getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Property 2: getAllOrders returns orders sorted by createdAt descending",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // A non-empty array of timestamps
          fc.array(fc.integer({ min: 0, max: 2_000_000_000_000 }), {
            minLength: 1,
            maxLength: 20,
          }),
          async (timestamps: number[]) => {
            const orders = timestamps.map((ts) =>
              makeOrderWithDate(new Date(ts)),
            );

            // Simulate what the DB does: sort descending before returning
            const sorted = [...orders].sort(
              (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
            );

            // getAllOrders uses a chained query: find().sort().skip().limit()
            mockFind.mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue(sorted),
                }),
              }),
            });

            mockCountDocuments.mockResolvedValue(sorted.length);

            const { orders: result } = await OrderAdminService.getAllOrders({
              page: 1,
              limit: 100,
            });

            // Assert: each element's createdAt >= next element's createdAt
            for (let i = 0; i < result.length - 1; i++) {
              expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(
                result[i + 1].createdAt.getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

// Feature: order-module, Property 3: client ownership enforcement returns 403 for other users' orders

import { Order as OrderModel } from "../../../models/Order";

const mockFindById = OrderModel.findById as jest.Mock;

describe("OrderService – Property 3: client ownership enforcement returns 403 for other users' orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Validates: Requirements 2.2, 2.6
   *
   * Property 3: For any client user and any order that does not belong to that user,
   * calling `getOrderById` as that client should throw a 403 error — never return the order.
   */
  it(
    "Property 3: getOrderById throws 403 when a client requests an order owned by a different user",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // The requesting client's userId
          hexObjectId(),
          // The order owner's userId (must be different)
          hexObjectId(),
          async (clientId: string, orderOwnerId: string) => {
            // Ensure the two IDs are distinct
            fc.pre(clientId !== orderOwnerId);

            const orderId = new mongoose.Types.ObjectId().toHexString();

            // Build an order owned by a different user
            const order = {
              _id: new mongoose.Types.ObjectId(orderId),
              userId: new mongoose.Types.ObjectId(orderOwnerId),
              status: "Pending" as const,
              createdAt: new Date(),
            };

            mockFindById.mockResolvedValue(order);

            const requestingUser = {
              _id: clientId,
              role: "client" as const,
            };

            await expect(
              OrderService.getOrderById(orderId, requestingUser as any),
            ).rejects.toMatchObject({ statusCode: 403 });
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

// Feature: order-module, Property 8: pagination returns at most limit results with accurate total

describe("OrderAdminService – Property 8: pagination returns at most limit results with accurate total", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Validates: Requirements 3.4, 3.5
   *
   * Property 8: For any admin orders query with `page` P and `limit` L, the number
   * of returned orders should be at most L, and `total` should equal the count of
   * all orders matching the filter regardless of pagination.
   */
  it(
    "Property 8: result.orders.length <= limit, total equals full count, page and limit are echoed back",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),   // page
          fc.integer({ min: 1, max: 50 }),   // limit
          fc.integer({ min: 0, max: 100 }),  // totalOrderCount
          async (page: number, limit: number, totalOrderCount: number) => {
            // Number of orders on this page: min(limit, remaining after skip)
            const skip = (page - 1) * limit;
            const remaining = Math.max(0, totalOrderCount - skip);
            const pageCount = Math.min(limit, remaining);

            // Build minimal order stubs for this page
            const pageOrders = Array.from({ length: pageCount }, () => ({
              _id: new mongoose.Types.ObjectId(),
              userId: new mongoose.Types.ObjectId(),
              status: "Pending" as const,
              createdAt: new Date(),
            }));

            // Mock the chained find().sort().skip().limit() call
            mockFind.mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue(pageOrders),
                }),
              }),
            });

            // Mock countDocuments to return the full collection size
            mockCountDocuments.mockResolvedValue(totalOrderCount);

            const result = await OrderAdminService.getAllOrders({ page, limit });

            // Assert: returned page has at most `limit` orders
            expect(result.orders.length).toBeLessThanOrEqual(limit);

            // Assert: total reflects the full count, not just the page
            expect(result.total).toBe(totalOrderCount);

            // Assert: page and limit are echoed back unchanged
            expect(result.page).toBe(page);
            expect(result.limit).toBe(limit);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
