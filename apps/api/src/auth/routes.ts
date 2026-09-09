import { Router } from "express";

import { loginUser } from "./login.js";
import { getUserFromSession, revokeSession } from "./session.js";
import { registerUser } from "./service.js";
import { loginSchema, registerSchema } from "./validation.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      message: "Invalid registration data",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const user = await registerUser(parsed.data);

    return res.status(201).json({
      status: "ok",
      user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_ALREADY_EXISTS") {
      return res.status(409).json({
        status: "error",
        message: "User already exists",
      });
    }

    console.error("Registration failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      message: "Invalid login data",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const result = await loginUser(
      parsed.data.email,
      parsed.data.password,
    );

    if (!result) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    res.cookie("session", result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: result.expiresAt,
      path: "/",
    });

    return res.json({
      status: "ok",
      user: result.user,
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

authRouter.get("/me", async (req, res) => {
  const sessionToken = req.cookies.session;

  if (!sessionToken) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  try {
    const session = await getUserFromSession(sessionToken);

    if (!session) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired session",
      });
    }

    return res.json({
      status: "ok",
      user: {
        id: session.userId,
        email: session.email,
      },
      session: {
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("Session lookup failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

authRouter.post("/logout", async (req, res) => {
  const sessionToken = req.cookies.session;

  if (sessionToken) {
    try {
      await revokeSession(sessionToken);
    } catch (error) {
      console.error("Logout failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }

  res.clearCookie("session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res.json({
    status: "ok",
    message: "Logged out",
  });
});

authRouter.post("/logout", async (req, res) => {
  const sessionToken = req.cookies.session;

  if (sessionToken) {
    try {
      await revokeSession(sessionToken);
    } catch (error) {
      console.error("Logout failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }

  res.clearCookie("session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res.json({
    status: "ok",
    message: "Logged out",
  });
});
