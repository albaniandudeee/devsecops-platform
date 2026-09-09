import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, "../../../..");

dotenv.config({
  path: resolve(projectRoot, ".env"),
});

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  database: {
    host: required("DATABASE_HOST"),
    port: Number(process.env.DATABASE_PORT || 5432),
    name: required("DATABASE_NAME"),
    user: required("DATABASE_USER"),
    password: required("DATABASE_PASSWORD"),
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  port: Number(process.env.PORT || 3000),
};
