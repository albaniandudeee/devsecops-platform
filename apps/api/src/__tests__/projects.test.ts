import { describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../app.js";
import { registerAndLogin } from "./helpers/auth.js";

async function createTestUser(prefix: string) {
  const email = `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;

  const password = "TestStrongPassword123!";

  const { response, cookie } = await registerAndLogin(
    email,
    password,
  );

  if (response.status !== 200) {
    throw new Error(
      `Test login failed with status ${response.status}`,
    );
  }

  return {
    email,
    cookie,
    userId: response.body.user.id,
  };
}

async function createTestProject(cookie: string) {
  const response = await request(app)
    .post("/projects")
    .set("Cookie", cookie)
    .send({
      name: `Test Project ${Date.now()}`,
      slug: `test-project-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
      description: "Automated security test project",
    });

  if (response.status !== 201) {
    throw new Error(
      `Project creation failed with status ${response.status}`,
    );
  }

  return response.body.project;
}

describe("Project authorization", () => {
  it("rejects unauthenticated project access", async () => {
    const response = await request(app)
      .get("/projects/invalid");

    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated member listing", async () => {
    const response = await request(app)
      .get("/projects/invalid/members");

    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated role changes", async () => {
    const response = await request(app)
      .patch("/projects/invalid/members/invalid")
      .send({ role: "member" });

    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated member deletion", async () => {
    const response = await request(app)
      .delete("/projects/invalid/members/invalid");

    expect(response.status).toBe(401);
  });
});

describe("Project RBAC", () => {
  it("rejects an authenticated non-member", async () => {
    const owner = await createTestUser("owner");
    const attacker = await createTestUser("attacker");

    const project = await createTestProject(owner.cookie);

    const response = await request(app)
      .get(`/projects/${project.id}`)
      .set("Cookie", attacker.cookie);

    expect(response.status).toBe(403);
  });

  it("allows the project owner to access the project", async () => {
    const owner = await createTestUser("owner");
    const project = await createTestProject(owner.cookie);

    const response = await request(app)
      .get(`/projects/${project.id}`)
      .set("Cookie", owner.cookie);

    expect(response.status).toBe(200);
    expect(response.body.project.id).toBe(project.id);
  });

  it("allows the owner to list project members", async () => {
    const owner = await createTestUser("owner");
    const project = await createTestProject(owner.cookie);

    const response = await request(app)
      .get(`/projects/${project.id}/members`)
      .set("Cookie", owner.cookie);

    expect(response.status).toBe(200);
    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0].role).toBe("owner");
    expect(response.body.members[0]).not.toHaveProperty(
      "passwordHash",
    );
  });

  it("prevents an admin from changing the owner role", async () => {
    const owner = await createTestUser("owner");
    const admin = await createTestUser("admin");

    const project = await createTestProject(owner.cookie);

    await request(app)
      .post(`/projects/${project.id}/members`)
      .set("Cookie", owner.cookie)
      .send({
        userId: admin.userId,
        role: "admin",
      });

    const response = await request(app)
      .patch(
        `/projects/${project.id}/members/${owner.userId}`,
      )
      .set("Cookie", admin.cookie)
      .send({
        role: "member",
      });

    expect(response.status).toBe(403);
  });

  it("allows an owner to remove a member", async () => {
    const owner = await createTestUser("owner");
    const member = await createTestUser("member");

    const project = await createTestProject(owner.cookie);

    await request(app)
      .post(`/projects/${project.id}/members`)
      .set("Cookie", owner.cookie)
      .send({
        userId: member.userId,
        role: "member",
      });

    const response = await request(app)
      .delete(
        `/projects/${project.id}/members/${member.userId}`,
      )
      .set("Cookie", owner.cookie);

    expect(response.status).toBe(200);

    const access = await request(app)
      .get(`/projects/${project.id}`)
      .set("Cookie", member.cookie);

    expect(access.status).toBe(403);
  });

  it("prevents removing the project owner", async () => {
    const owner = await createTestUser("owner");
    const project = await createTestProject(owner.cookie);

    const response = await request(app)
      .delete(
        `/projects/${project.id}/members/${owner.userId}`,
      )
      .set("Cookie", owner.cookie);

    expect(response.status).toBe(403);
  });
});
