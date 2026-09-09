import request from "supertest";

import { app } from "../../app.js";

export async function registerAndLogin(
  email: string,
  password: string,
) {
  await request(app)
    .post("/auth/register")
    .send({
      email,
      password,
    });

  const response = await request(app)
    .post("/auth/login")
    .send({
      email,
      password,
    });

  const cookies = response.headers["set-cookie"];
  const cookie = cookies?.[0];

  if (!cookie) {
    throw new Error("Login did not return a session cookie");
  }

  return {
    response,
    cookie,
  };
}
