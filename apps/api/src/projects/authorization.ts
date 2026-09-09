import { and, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { projectMembers } from "../db/schema.js";

export type ProjectRole = "owner" | "admin" | "member";

const ROLE_LEVEL: Record<ProjectRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export async function getProjectRole(
  projectId: string,
  userId: string,
): Promise<ProjectRole | null> {
  const [membership] = await db
    .select({
      role: projectMembers.role,
    })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);

  return membership?.role ?? null;
}

export async function hasProjectRole(
  projectId: string,
  userId: string,
  minimumRole: ProjectRole,
): Promise<boolean> {
  const role = await getProjectRole(projectId, userId);

  if (!role) {
    return false;
  }

  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimumRole];
}
