// Feature: order-module
import {
  objectIdParamSchema,
  assignOrderItemSchema,
  adminOrdersQuerySchema,
} from "../validators/orderValidators";

describe("orderValidators", () => {
  // Feature: order-module
  describe("objectIdParamSchema", () => {
    it("rejects a non-hex :id string", () => {
      // Feature: order-module
      const result = objectIdParamSchema.safeParse({ id: "not-a-valid-id" });
      expect(result.success).toBe(false);
    });

    it("accepts a valid 24-char hex ObjectId", () => {
      // Feature: order-module
      const validId = "a1b2c3d4e5f6a1b2c3d4e5f6";
      const result = objectIdParamSchema.safeParse({ id: validId });
      expect(result.success).toBe(true);
    });
  });

  // Feature: order-module
  describe("assignOrderItemSchema", () => {
    const validOrderItemId = "a1b2c3d4e5f6a1b2c3d4e5f6";

    it("rejects when machineId is missing", () => {
      // Feature: order-module
      const result = assignOrderItemSchema.safeParse({ orderItemId: validOrderItemId });
      expect(result.success).toBe(false);
    });

    it("rejects when machineId is an empty string", () => {
      // Feature: order-module
      const result = assignOrderItemSchema.safeParse({
        orderItemId: validOrderItemId,
        machineId: "",
      });
      expect(result.success).toBe(false);
    });
  });

  // Feature: order-module
  describe("adminOrdersQuerySchema", () => {
    it("coerces page and limit from string to integer", () => {
      // Feature: order-module
      const result = adminOrdersQuerySchema.safeParse({ page: "2", limit: "10" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
      }
    });

    it("uses defaults (page=1, limit=20) when not provided", () => {
      // Feature: order-module
      const result = adminOrdersQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });
  });
});
