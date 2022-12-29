"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importDefault(require("chai"));
const chai_http_1 = __importDefault(require("chai-http"));
const mocha_1 = require("mocha");
const app_1 = __importDefault(require("../app"));
chai_1.default.use(chai_http_1.default);
(0, mocha_1.describe)("Checking authentication controller", () => {
    it("Should return 200 Status when logging in with the correct credential.", () => {
        const loginData = {
            username: "danielrudianto",
            password: "jamuju18,bandung",
        };
        return chai_1.default
            .request(app_1.default)
            .post("/auth/login")
            .send(loginData)
            .then((res) => {
            chai_1.default.expect(res.status).to.eql(200);
        });
    });
    it("Should return 400 Status when logging in with the wrong credential.", () => {
        const loginData = {
            username: "danielrudiantos",
            password: "jamuju18,bandung",
        };
        return chai_1.default
            .request(app_1.default)
            .post("/auth/login")
            .send(loginData)
            .then((res) => {
            chai_1.default.expect(res.status).to.eql(400);
            chai_1.default.expect(res.text).to.eql("Username / kata sandi salah.");
        });
    });
});
