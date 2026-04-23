// src/utils/queueManager.ts
import { Queue, DefaultJobOptions } from "bullmq";
import { redisConfig } from "#src/configs/redisConfig";

export const QUEUE_NAMES = {
  AI_GENERATION: "AI_GENERATION",
  TEXT_TO_IMAGE: "TEXT_TO_IMAGE",
  SLICING: "SLICING",
  PRINTING: "PRINTING",
  MANUFACTURING: "MANUFACTURING",
  DLQ: "DEAD_LETTER_QUEUE", // Global Dead Letter Queue
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
  removeOnComplete: {
    age: 3600, // Keep completed jobs for 1 hour (3600 seconds)
    count: 1000, // Keep last 1000 completed jobs
  },
  removeOnFail: {
    age: 86400, // Keep failed jobs for 24 hours
    count: 1000, // Keep last 1000 failed jobs
  },
};

class QueueManager {
  private queues: Map<string, Queue> = new Map();

  getQueue(name: QueueName): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: redisConfig,
        defaultJobOptions,
      });
      this.queues.set(name, queue);
    }
    
    return this.queues.get(name)!;
  }

  getDlq(): Queue {
    return this.getQueue(QUEUE_NAMES.DLQ);
  }
}

export const queueManager = new QueueManager();

// Export getQueue for backward compatibility
export const getQueue = (name: QueueName) => queueManager.getQueue(name);

