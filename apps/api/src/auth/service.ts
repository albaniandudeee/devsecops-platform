import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashPassword } from "./password.js";
import type { RegisterInput } from "./validation.js";

export async function registerUser(input: RegisterInput) {
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("USER_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
    })
    .returning({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
    });

  return user;
}
