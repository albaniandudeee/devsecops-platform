import { Router } from "express";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { projects } from "../db/schema.js";
import { AppError } from "../errors/app-error.js";
import { requireAuth } from "../middleware/auth.js";
import { requireProjectRole } from "../middleware/project-auth.js";
import { recordAuditEvent } from "../audit/service.js";

import {
  createProject,
} from "./service.js";
import {
  createProjectSchema,
} from "./validation.js";
import {
  listProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from "./member-service.js";
import {
  addProjectMemberSchema,
  updateProjectMemberSchema,
} from "./member-validation.js";

export const projectsRouter = Router();

projectsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Invalid project data",
      parsed.error.flatten(),
    );
  }

  const project = await createProject(
    req.user!.id,
    parsed.data,
  );

  await recordAuditEvent(req, {
    action: "project_created",
    userId: req.user!.id,
    resource: "project",
    resourceId: project.id,
    success: true,
  });

  return res.status(201).json({
    status: "ok",
    project,
  });
});

projectsRouter.get(
  "/:id",
  requireAuth,
  requireProjectRole("member"),
  async (req, res) => {
    const projectId = req.params.id;

    if (typeof projectId !== "string" || !projectId) {
      throw new AppError(
        400,
        "INVALID_PROJECT_ID",
        "Invalid project ID",
      );
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new AppError(
        404,
        "PROJECT_NOT_FOUND",
        "Project not found",
      );
    }

    return res.json({
      status: "ok",
      project,
    });
  },
);

projectsRouter.post(
  "/:id/members",
  requireAuth,
  requireProjectRole("admin"),
  async (req, res) => {
    const projectId = req.params.id;

    if (typeof projectId !== "string" || !projectId) {
      throw new AppError(
        400,
        "INVALID_PROJECT_ID",
        "Invalid project ID",
      );
    }

    const parsed = addProjectMemberSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Invalid member data",
        parsed.error.flatten(),
      );
    }

    const result = await addProjectMember(
      projectId,
      parsed.data,
    );

    await recordAuditEvent(req, {
      action: "member_added",
      userId: req.user!.id,
      resource: "project_member",
      resourceId: result.membership.id,
      success: true,
      metadata: {
        projectId,
        memberUserId: parsed.data.userId,
        role: parsed.data.role,
      },
    });

    return res.status(201).json({
      status: "ok",
      member: result.membership,
      user: result.user,
    });
  },
);

projectsRouter.get(
  "/:id/members",
  requireAuth,
  requireProjectRole("member"),
  async (req, res) => {
    const projectId = req.params.id;

    if (typeof projectId !== "string" || !projectId) {
      throw new AppError(
        400,
        "INVALID_PROJECT_ID",
        "Invalid project ID",
      );
    }

    const members = await listProjectMembers(projectId);

    return res.json({
      status: "ok",
      members,
    });
  },
);

projectsRouter.patch(
  "/:id/members/:userId",
  requireAuth,
  requireProjectRole("admin"),
  async (req, res) => {
    const { id: projectId, userId } = req.params;

    if (
      typeof projectId !== "string" ||
      !projectId ||
      typeof userId !== "string" ||
      !userId
    ) {
      throw new AppError(
        400,
        "INVALID_PROJECT_OR_USER_ID",
        "Invalid project or user ID",
      );
    }

    const parsed = updateProjectMemberSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Invalid member data",
        parsed.error.flatten(),
      );
    }

    const member = await updateProjectMemberRole(
      projectId,
      userId,
      parsed.data.role,
    );

    await recordAuditEvent(req, {
      action: "role_changed",
      userId: req.user!.id,
      resource: "project_member",
      resourceId: member.id,
      success: true,
      metadata: {
        projectId,
        memberUserId: userId,
        newRole: parsed.data.role,
      },
    });

    return res.json({
      status: "ok",
      member,
    });
  },
);

projectsRouter.delete(
  "/:id/members/:userId",
  requireAuth,
  requireProjectRole("admin"),
  async (req, res) => {
    const { id: projectId, userId } = req.params;

    if (
      typeof projectId !== "string" ||
      !projectId ||
      typeof userId !== "string" ||
      !userId
    ) {
      throw new AppError(
        400,
        "INVALID_PROJECT_OR_USER_ID",
        "Invalid project or user ID",
      );
    }

    const member = await removeProjectMember(
      projectId,
      userId,
    );

    await recordAuditEvent(req, {
      action: "member_removed",
      userId: req.user!.id,
      resource: "project_member",
      resourceId: member.id,
      success: true,
      metadata: {
        projectId,
        memberUserId: userId,
        removedRole: member.role,
      },
    });

    return res.json({
      status: "ok",
      member,
    });
  },
);
