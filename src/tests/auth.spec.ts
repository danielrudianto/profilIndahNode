import chai from "chai";
import chaiHttp from "chai-http";
import { describe } from "mocha";
import app from "../app";
import { authMiddleware } from "../helper/auth.helper";

chai.use(chaiHttp);

describe("Checking authentication controller", () => {
  it("Should return 200 Status when logging in with the correct credential.", () => {
    const loginData = {
      username: "danielrudianto",
      password: "jamuju18,bandung",
    };
    return chai
      .request(app)
      .post("/auth/login")
      .send(loginData)
      .then((res) => {
        chai.expect(res.status).to.eql(200);
      });
  });

  it("Should return 400 Status when logging in with the wrong credential.", () => {
    const loginData = {
      username: "danielrudiantos",
      password: "jamuju18,bandung",
    };
    return chai
      .request(app)
      .post("/auth/login")
      .send(loginData)
      .then((res) => {
        chai.expect(res.status).to.eql(400);
        chai.expect(res.text).to.eql("Username / kata sandi salah.");
      });
  });
});
