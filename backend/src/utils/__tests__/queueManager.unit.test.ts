import { Queue } from "bullmq";
import { getQueue, QUEUE_NAMES } from "#src/utils/queueManager";
import { redisConnection } from "#src/configs/redisConfig";

describe("Queue Manager", () => {
  afterAll(async () => {
    // Close all queue connections to prevent hanging
    const aiQueue = getQueue(QUEUE_NAMES.AI_GENERATION);
    const mfgQueue = getQueue(QUEUE_NAMES.MANUFACTURING);
    await aiQueue.close();
    await mfgQueue.close();
  });
  describe("QUEUE_NAMES constant", () => {
    it("should include AI_GENERATION", () => {
      expect(QUEUE_NAMES.AI_GENERATION).toBe("AI_GENERATION");
    });

    it("should include MANUFACTURING", () => {
      expect(QUEUE_NAMES.MANUFACTURING).toBe("MANUFACTURING");
    });
  });

  describe("getQueue function", () => {
    it("should return a Queue instance", () => {
      const queue = getQueue(QUEUE_NAMES.AI_GENERATION);
      expect(queue).toBeInstanceOf(Queue);
    });

    it("should return the same instance for multiple calls with same name (singleton)", () => {
      const queue1 = getQueue(QUEUE_NAMES.AI_GENERATION);
      const queue2 = getQueue(QUEUE_NAMES.AI_GENERATION);
      expect(queue1).toBe(queue2);
    });

    it("should return different instances for different queue names", () => {
      const aiQueue = getQueue(QUEUE_NAMES.AI_GENERATION);
      const mfgQueue = getQueue(QUEUE_NAMES.MANUFACTURING);
      expect(aiQueue).not.toBe(mfgQueue);
    });

    it("should configure queue with correct name", () => {
      const queue = getQueue(QUEUE_NAMES.MANUFACTURING);
      expect(queue.name).toBe("MANUFACTURING");
    });
  });

  describe("Queue configuration", () => {
    it("should configure queue with 3 retry attempts", () => {
      const queue = getQueue(QUEUE_NAMES.AI_GENERATION);
      expect(queue.opts.defaultJobOptions?.attempts).toBe(3);
    });

    it("should configure queue with exponential backoff", () => {
      const queue = getQueue(QUEUE_NAMES.AI_GENERATION);
      expect(queue.opts.defaultJobOptions?.backoff).toEqual({
        type: "exponential",
        delay: 1000,
      });
    });

    it("should configure queue with removeOnComplete settings", () => {
      const queue = getQueue(QUEUE_NAMES.AI_GENERATION);
      expect(queue.opts.defaultJobOptions?.removeOnComplete).toEqual({
        age: 3600, // 1 hour
        count: 1000,
      });
    });

    it("should configure queue with removeOnFail settings", () => {
      const queue = getQueue(QUEUE_NAMES.AI_GENERATION);
      expect(queue.opts.defaultJobOptions?.removeOnFail).toEqual({
        age: 86400, // 24 hours
        count: 1000,
      });
    });
  });
});
