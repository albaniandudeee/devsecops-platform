import { db } from "../db/index.js";
import { projectMembers, projects } from "../db/schema.js";
import { AppError } from "../errors/app-error.js";

export async function createProject(
  userId: string,
  input: {
    name: string;
    slug: string;
    description?: string | undefined;
  },
) {
  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        createdBy: userId,
      })
      .returning();

    if (!project) {
      throw new AppError(
        500,
        "PROJECT_CREATION_FAILED",
        "Project creation failed",
      );
    }

    await tx.insert(projectMembers).values({
      projectId: project.id,
      userId,
      role: "owner",
    });

    return project;
  });
}
