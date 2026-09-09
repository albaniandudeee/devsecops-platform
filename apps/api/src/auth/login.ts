import crypto from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { users, sessions } from "../db/schema.js";
import { verifyPassword } from "./password.js";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function loginUser(email: string, password: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Don't reveal whether the email exists.
  if (!user) {
    return null;
  }

  const validPassword = await verifyPassword(
    user.passwordHash,
    password,
  );

  if (!validPassword) {
    return null;
  }

  // Generate a random opaque token.
  const sessionToken = crypto.randomBytes(32).toString("hex");

  // Never store the raw token in the database.
  const tokenHash = hashSessionToken(sessionToken);

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    sessionToken,
    expiresAt,
  };
}
