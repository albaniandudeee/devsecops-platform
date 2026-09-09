import helmet from "helmet";
import rateLimit from "express-rate-limit";

export const securityHeaders = helmet();

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests",
  },
});
