import mongoose from "mongoose";
import { ManufacturingJob } from "../ManufacturingJob";

describe("ManufacturingJob Model", () => {
  describe("Validation Hook", () => {
    it("should reject when neither productId nor targetOrderItemId is provided", async () => {
      const job = new ManufacturingJob({
        jobNumber: "JOB-123-abc",
        status: "Queued",
      });

      await expect(job.validate()).rejects.toThrow(
        "Either productId or targetOrderItemId must be provided"
      );
    });

    it("should reject when both productId and targetOrderItemId are provided", async () => {
      const job = new ManufacturingJob({
        jobNumber: "JOB-123-abc",
        productId: new mongoose.Types.ObjectId(),
        targetOrderItemId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      await expect(job.validate()).rejects.toThrow(
        "Cannot have both productId and targetOrderItemId"
      );
    });

    it("should accept when only productId is provided", async () => {
      const job = new ManufacturingJob({
        jobNumber: "JOB-123-abc",
        productId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      await expect(job.validate()).resolves.not.toThrow();
    });

    it("should accept when only targetOrderItemId is provided", async () => {
      const job = new ManufacturingJob({
        jobNumber: "JOB-123-abc",
        targetOrderItemId: new mongoose.Types.ObjectId(),
        orderId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      await expect(job.validate()).resolves.not.toThrow();
    });
  });

  describe("Optional Fields", () => {
    it("should accept product-based job with new optional fields", async () => {
      const job = new ManufacturingJob({
        jobNumber: "JOB-123-abc",
        productId: new mongoose.Types.ObjectId(),
        stlFileUrl: "https://example.com/model.stl",
        fileName: "model.stl",
        status: "Queued",
      });

      await expect(job.validate()).resolves.not.toThrow();
      expect(job.stlFileUrl).toBe("https://example.com/model.stl");
      expect(job.fileName).toBe("model.stl");
    });

    it("should accept order-based job without new optional fields", async () => {
      const job = new ManufacturingJob({
        jobNumber: "JOB-123-abc",
        targetOrderItemId: new mongoose.Types.ObjectId(),
        orderId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      await expect(job.validate()).resolves.not.toThrow();
      expect(job.stlFileUrl).toBeUndefined();
      expect(job.fileName).toBeUndefined();
    });
  });
});
