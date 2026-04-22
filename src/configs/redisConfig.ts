import { ConnectionOptions } from "bullmq";
import { env } from "#src/configs/envConfig";

export const redisConfig: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

// Backward compatibility export
export const redisConnection = redisConfig;
