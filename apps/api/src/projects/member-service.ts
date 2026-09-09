import { and, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  projectMembers,
  users,
} from "../db/schema.js";
import { AppError } from "../errors/app-error.js";

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
    throw new AppError(
      404,
      "USER_NOT_FOUND",
      "User not found",
    );
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
    throw new AppError(
      409,
      "USER_ALREADY_MEMBER",
      "User is already a project member",
    );
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
    throw new AppError(
      500,
      "MEMBER_CREATION_FAILED",
      "Project member creation failed",
    );
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
    throw new AppError(
      404,
      "MEMBERSHIP_NOT_FOUND",
      "Project member not found",
    );
  }

  if (membership.role === "owner") {
    throw new AppError(
      403,
      "CANNOT_CHANGE_OWNER_ROLE",
      "Owner role cannot be changed here",
    );
  }

  const [updated] = await db
    .update(projectMembers)
    .set({ role })
    .where(eq(projectMembers.id, membership.id))
    .returning();

  if (!updated) {
    throw new AppError(
      500,
      "MEMBER_UPDATE_FAILED",
      "Project member update failed",
    );
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
    throw new AppError(
      404,
      "MEMBERSHIP_NOT_FOUND",
      "Project member not found",
    );
  }

  if (membership.role === "owner") {
    throw new AppError(
      403,
      "CANNOT_REMOVE_OWNER",
      "Project owner cannot be removed",
    );
  }

  const [deleted] = await db
    .delete(projectMembers)
    .where(eq(projectMembers.id, membership.id))
    .returning();

  if (!deleted) {
    throw new AppError(
      500,
      "MEMBER_DELETE_FAILED",
      "Project member deletion failed",
    );
  }

  return deleted;
}
