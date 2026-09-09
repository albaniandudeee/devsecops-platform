import { z } from "zod";

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

export const updateProjectMemberSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export type AddProjectMemberInput = z.infer<
  typeof addProjectMemberSchema
>;

export type UpdateProjectMemberInput = z.infer<
  typeof updateProjectMemberSchema
>;
