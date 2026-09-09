import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, async (req, res) => {
  return res.json({
    status: "ok",
    user: req.user,
    sessionId: req.sessionId,
  });
});
