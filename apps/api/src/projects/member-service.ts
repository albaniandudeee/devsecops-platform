import { and, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  projectMembers,
  projects,
  users,
} from "../db/schema.js";

export async function listProjectMembers(projectId: string) {
  return db
    .select({
      id: projectMembers.id,
      userId: users.id,
      email: users.email,
      role: projectMembers.role,
      createdAt: projectMembers.createdAt,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));
}

export async function addProjectMember(
  projectId: string,
  input: {
    userId: string;
    role: "admin" | "member";
  },
) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const [existingMembership] = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, input.userId),
      ),
    )
    .limit(1);

  if (existingMembership) {
    throw new Error("USER_ALREADY_MEMBER");
  }

  const [membership] = await db
    .insert(projectMembers)
    .values({
      projectId,
      userId: input.userId,
      role: input.role,
    })
    .returning();

  if (!membership) {
    throw new Error("MEMBER_CREATION_FAILED");
  }

  return { membership, user };
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: "admin" | "member",
) {
  const [membership] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new Error("MEMBERSHIP_NOT_FOUND");
  }

  if (membership.role === "owner") {
    throw new Error("CANNOT_CHANGE_OWNER_ROLE");
  }

  const [updated] = await db
    .update(projectMembers)
    .set({ role })
    .where(eq(projectMembers.id, membership.id))
    .returning();

  if (!updated) {
    throw new Error("MEMBER_UPDATE_FAILED");
  }

  return updated;
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
) {
  const [membership] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new Error("MEMBERSHIP_NOT_FOUND");
  }

  if (membership.role === "owner") {
    throw new Error("CANNOT_REMOVE_OWNER");
  }

  const [deleted] = await db
    .delete(projectMembers)
    .where(eq(projectMembers.id, membership.id))
    .returning();

  if (!deleted) {
    throw new Error("MEMBER_DELETE_FAILED");
  }

  return deleted;
}
