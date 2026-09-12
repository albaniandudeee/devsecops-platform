import * as IORedis from "ioredis";

import { env } from "../config/env.js";

export const redisConnection = new IORedis.Redis(env.redis.url, {
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (error: Error) => {
  console.error("Redis connection error:", error);
});

redisConnection.on("connect", () => {
  console.log("Redis connection established");
});

export async function checkRedis(): Promise<void> {
  if (redisConnection.status !== "ready") {
    throw new Error(`Redis is not ready: ${redisConnection.status}`);
  }

  await Promise.race([
    redisConnection.ping(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Redis health check timed out"));
      }, 2000);
    }),
  ]);
}	
