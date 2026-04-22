import Redis from "ioredis";
import { env } from "#src/configs/envConfig";

class RedisCache {
  private client: Redis;
  private static instance: RedisCache;

  private constructor() {
    this.client = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      lazyConnect: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on("error", (err) => {
      console.error("Redis Cache Client Error:", err);
    });

    this.client.on("connect", () => {
      console.log("✅ Redis Cache connected");
    });
  }

  static getInstance(): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache();
    }
    return RedisCache.instance;
  }

  async connect(): Promise<void> {
    if (this.client.status === "ready") return;
    await this.client.connect();
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }
}

export const redisCache = RedisCache.getInstance();
