import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";

import { db } from "../db/index.js";
import { sessions, users } from "../db/schema.js";

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function getUserFromSession(sessionToken: string) {
  const tokenHash = hashSessionToken(sessionToken);

  const [result] = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    sessionId: result.sessionId,
    userId: result.userId,
    email: result.email,
    expiresAt: result.expiresAt,
  };
}

export async function revokeSession(sessionToken: string): Promise<void> {
  const tokenHash = hashSessionToken(sessionToken);

  await db
    .delete(sessions)
    .where(eq(sessions.tokenHash, tokenHash));
}
