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
