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
import { Router } from "express";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { projects } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { requireProjectRole } from "../middleware/project-auth.js";
import { createProject } from "./service.js";
import { createProjectSchema } from "./validation.js";

export const projectsRouter = Router();

projectsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      message: "Invalid project data",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const project = await createProject(req.user!.id, parsed.data);

    return res.status(201).json({
      status: "ok",
      project,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("duplicate key")
    ) {
      return res.status(409).json({
        status: "error",
        message: "Project slug already exists",
      });
    }

    console.error("Project creation failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

projectsRouter.get(
  "/:id",
  requireAuth,
  requireProjectRole("member"),
  async (req, res) => {
    const projectId = req.params.id;

    if (typeof projectId !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Invalid project ID",
      });
    }

    try {

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project) {
        return res.status(404).json({
          status: "error",
          message: "Project not found",
        });
      }

      return res.json({
        status: "ok",
        project,
      });
    } catch (error) {
      console.error("Project retrieval failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },
);

projectsRouter.post(
  "/:id/members",
  requireAuth,
  requireProjectRole("admin"),
  async (req, res) => {
    const projectId = req.params.id;

    if (typeof projectId !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Invalid project ID",
      });
    }

    const parsed = addProjectMemberSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid member data",
        errors: parsed.error.flatten(),
      });
    }

    try {
      const result = await addProjectMember(
        projectId,
        parsed.data,
      );

      return res.status(201).json({
        status: "ok",
        member: result.membership,
        user: result.user,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "USER_NOT_FOUND"
      ) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      if (
        error instanceof Error &&
        error.message === "USER_ALREADY_MEMBER"
      ) {
        return res.status(409).json({
          status: "error",
          message: "User is already a project member",
        });
      }

      console.error("Project member creation failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },
);

projectsRouter.get(
  "/:id/members",
  requireAuth,
  requireProjectRole("member"),
  async (req, res) => {
    const projectId = req.params.id;

    if (typeof projectId !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Invalid project ID",
      });
    }

    try {
      const members = await listProjectMembers(projectId);

      return res.json({
        status: "ok",
        members,
      });
    } catch (error) {
      console.error("Project member listing failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
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
      typeof userId !== "string"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid project or user ID",
      });
    }

    const parsed = updateProjectMemberSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid member data",
        errors: parsed.error.flatten(),
      });
    }

    try {
      const member = await updateProjectMemberRole(
        projectId,
        userId,
        parsed.data.role,
      );

      return res.json({
        status: "ok",
        member,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "MEMBERSHIP_NOT_FOUND"
      ) {
        return res.status(404).json({
          status: "error",
          message: "Project member not found",
        });
      }

      if (
        error instanceof Error &&
        error.message === "CANNOT_CHANGE_OWNER_ROLE"
      ) {
        return res.status(403).json({
          status: "error",
          message: "Owner role cannot be changed here",
        });
      }

      console.error("Project member update failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
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
      typeof userId !== "string"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid project or user ID",
      });
    }

    try {
      const member = await removeProjectMember(
        projectId,
        userId,
      );

      return res.json({
        status: "ok",
        member,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "MEMBERSHIP_NOT_FOUND"
      ) {
        return res.status(404).json({
          status: "error",
          message: "Project member not found",
        });
      }

      if (
        error instanceof Error &&
        error.message === "CANNOT_REMOVE_OWNER"
      ) {
        return res.status(403).json({
          status: "error",
          message: "Project owner cannot be removed",
        });
      }

      console.error("Project member removal failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },
);


