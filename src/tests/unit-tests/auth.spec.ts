import AuthController from "../../controller/auth.controller";
import request from "supertest";

const baseURL = `http://localhost:5000`;

describe("Auth routes", () => {
  const loginData = {
    username: "danielrudianto",
    password: "jamuju18,bandung",
  };
  test("Login", async () => {
    const res = await request(baseURL).get("/item");
    expect(res.statusCode).toBe(401);
  });
});
